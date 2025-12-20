
import { supabase } from './supabaseClient';
import { getAccessToken } from './authService';

// Proxy URL for Data API calls (via backend to protect API Key)
const API_PROXY_URL = (import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://yt-dashboard-backend.vercel.app')) + '/api/youtube/proxy';

const fetchFromProxy = async (endpoint: string, params: Record<string, string>) => {
    const url = new URL(API_PROXY_URL);
    url.searchParams.append('endpoint', endpoint);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key]);
        }
    });

    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Proxy Error (${endpoint}): ${text}`);
    }
    return await res.json();
};

const ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';

export interface VideoSyncStatus {
    total: number;
    processed: number;
    isSyncing: boolean;
    error?: string;
}

// 1. Get channel ID + Uploads Playlist (Requires OAuth Token for "mine=true")
const getChannelDetails = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Usuário não autenticado no Google.");

    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails,id,snippet&mine=true`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Falha ao buscar detalhes do canal.");
    const data = await res.json();
    if (!data.items || data.items.length === 0) throw new Error("Canal não encontrado.");

    return data.items[0];
};

// 2. Fetch all video IDs from playlist (Iterates pages)
const fetchAllPlaylistVideos = async (playlistId: string, onProgress: (count: number) => void) => {
    let videos: any[] = [];
    let nextPageToken = '';

    do {
        const params: any = {
            part: 'snippet',
            playlistId: playlistId,
            maxResults: '50'
        };
        if (nextPageToken) params.pageToken = nextPageToken;

        const data = await fetchFromProxy('playlistItems', params);

        if (data.items) {
            videos = [...videos, ...data.items];
            onProgress(videos.length);
        }
        nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    // Extract minimal info needed for next steps
    return videos.map((v: any) => ({
        videoId: v.snippet.resourceId.videoId,
        publishedAt: v.snippet.publishedAt,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url
    }));
};

// 3. Fetch Analytics for a batch of videos
const fetchAnalyticsForBatch = async (videoIds: string[], token: string) => {
    if (videoIds.length === 0) return [];

    const idsStr = videoIds.join(',');
    // Metrics: views, estimatedMinutesWatched, averageViewDuration, subscribersGained, cardImpressions, cardClickRate
    // Dimensions: video
    // Filter: video==id1,id2...

    // We try to fetch card metrics. If that fails, we retry without.
    const metrics = 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,cardImpressions,cardClickRate';
    const baseUrl = `${ANALYTICS_URL}?ids=channel==MINE&startDate=2005-01-01&endDate=${new Date().toISOString().split('T')[0]}`;
    const url = `${baseUrl}&metrics=${metrics}&dimensions=video&filters=video==${idsStr}`;

    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!res.ok) {
        // Fallback: core basic metrics
        const simpleMetrics = 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained';
        const simpleUrl = `${baseUrl}&metrics=${simpleMetrics}&dimensions=video&filters=video==${idsStr}`;
        res = await fetch(simpleUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
            const errorText = await res.text();
            console.warn("Failed to fetch analytics for batch:", idsStr, errorText);
            return [];
        }
    }

    const data = await res.json();
    return data.rows || [];
};

// 4. Batch Upsert to Supabase
const batchUpsertVideos = async (videos: any[]) => {
    // Upserting to 'yt_myvideos' as per user instruction
    const { error } = await supabase.from('yt_myvideos').upsert(videos, { onConflict: 'video_id' });
    if (error) throw error;
};

// --- MAIN EXPORTED FUNCTION ---
export const syncVideos = async (onProgress: (status: VideoSyncStatus) => void) => {
    try {
        onProgress({ total: 0, processed: 0, isSyncing: true });

        // A. Get Channel Info
        const channel = await getChannelDetails();
        const uploadsId = channel.contentDetails.relatedPlaylists.uploads;
        const channelId = channel.id;

        // B. Get All Video IDs
        const basicVideos = await fetchAllPlaylistVideos(uploadsId, (count) => {
            onProgress({ total: count, processed: 0, isSyncing: true });
        });

        const total = basicVideos.length;
        let processed = 0;
        onProgress({ total, processed: 0, isSyncing: true });

        const token = await getAccessToken();
        if (!token) throw new Error("Token de acesso inválido/expirado.");

        // C. Process in Batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = basicVideos.slice(i, i + BATCH_SIZE);
            const videoIds = batch.map(v => v.videoId);

            // 1. Get Details (Data API)
            const detailsData = await fetchFromProxy('videos', {
                part: 'snippet,contentDetails,statistics,status',
                id: videoIds.join(',')
            });
            const detailsMap = new Map(detailsData.items?.map((item: any) => [item.id, item]) || []);

            // 2. Get Analytics (Analytics API)
            const analyticsRows = await fetchAnalyticsForBatch(videoIds, token);
            const analyticsMap = new Map(analyticsRows.map((row: any) => [row[0], row]));

            // 3. Prepare Rows
            const upsertRows = batch.map(v => {
                const det = detailsMap.get(v.videoId);
                const ana = analyticsMap.get(v.videoId);
                // ana structure: [id, views, watchTime, avgDur, subs, imp, ctr] (if all metrics fetched)
                // If fallback used: [id, views, watchTime, avgDur, subs]

                // Helper to safely get index.
                // We assume if row length > 5 it has imp/ctr.
                const hasImp = ana && ana.length > 5;

                return {
                    video_id: v.videoId,
                    channel_id: channelId,
                    title: v.title,
                    description: det?.snippet?.description || v.description,
                    thumbnail_url: v.thumbnail,
                    published_at: v.publishedAt,

                    // Public Stats
                    view_count: parseInt(det?.statistics?.viewCount || '0'),
                    like_count: parseInt(det?.statistics?.likeCount || '0'),
                    comment_count: parseInt(det?.statistics?.commentCount || '0'),
                    duration: det?.contentDetails?.duration,
                    privacy_status: det?.status?.privacyStatus,
                    tags: det?.snippet?.tags || [],

                    // Analytics Stats
                    analytics_views: ana ? ana[1] : 0,
                    estimated_minutes_watched: ana ? ana[2] : 0,
                    average_view_duration_seconds: ana ? ana[3] : 0,
                    subscribers_gained: ana ? ana[4] : 0,
                    impressions: hasImp ? ana[5] : 0,
                    click_through_rate: hasImp ? ana[6] : 0,

                    last_updated: new Date().toISOString()
                };
            });

            // 4. Upsert
            await batchUpsertVideos(upsertRows);

            processed += batch.length;
            onProgress({ total, processed, isSyncing: true });
        }

        onProgress({ total, processed, isSyncing: false });

    } catch (error: any) {
        console.error("Video Sync Error:", error);
        onProgress({ total: 0, processed: 0, isSyncing: false, error: error.message });
        throw error;
    }
};

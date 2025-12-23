import { Competitor, StatSnapshot } from '../types';
import { getAccessToken } from './authService';

// --- CONFIGURAÇÃO DA API ---
// A chave agora está no backend (.env)
// Mantemos as funções exportadas para compatibilidade, mas elas não fazem nada ou retornam dummy
export const getYoutubeApiKey = (): string | null => {
    return "BACKEND_MANAGED";
};

export const setYoutubeApiKey = (key: string) => {
    // No-op
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('yt_api_key_custom', key);
    }
};

export interface VideoData {
    id: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    estimatedMinutesWatched?: number;
    subscribersGained?: number;
    estimatedRevenue?: number;
    privacyStatus?: string;
    description?: string;
    duration?: string;
    channelId?: string;
}

const ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';
const BASE_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://yt-dashboard-backend.vercel.app')) + '/api/youtube';
const API_URL = `${BASE_BACKEND_URL}/proxy`;

const fetchFromProxy = async (endpoint: string, params: Record<string, string>) => {
    const url = new URL(API_URL);
    url.searchParams.append('endpoint', endpoint);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key]);
        }
    });

    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text();
        console.error(`Proxy Error (${endpoint}):`, text);
        throw new Error(`Erro na API do YouTube (Proxy): ${text}`);
    }
    return await res.json();
};

const extractChannelIdentifier = (input: string): { type: 'id' | 'handle' | 'search', value: string } => {
    let cleaned = input.trim();
    if (cleaned.includes('youtube.com/')) {
        const urlParts = cleaned.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        const secondLastPart = urlParts[urlParts.length - 2];
        if (secondLastPart === 'channel') return { type: 'id', value: lastPart };
        if (cleaned.includes('@')) {
            const handlePart = urlParts.find(p => p.startsWith('@'));
            if (handlePart) return { type: 'handle', value: handlePart };
        }
    }
    if (cleaned.startsWith('UC')) return { type: 'id', value: cleaned };
    if (cleaned.startsWith('@')) return { type: 'handle', value: cleaned };
    return { type: 'handle', value: cleaned };
};

export const fetchYoutubeChannelData = async (input: string): Promise<{ competitor: Partial<Competitor>, stats: Omit<StatSnapshot, 'id'>, uploadsPlaylistId?: string, avatarUrl?: string } | null> => {
    const { type, value } = extractChannelIdentifier(input);

    let items: any[] = [];

    // 1. Try Direct Lookup
    if (type === 'id' && value.startsWith('UC')) {
        try {
            const data = await fetchFromProxy('channels', {
                part: 'snippet,statistics,contentDetails',
                id: value
            });
            if (data.items) items = data.items;
        } catch (e) { console.warn("ID lookup warning:", e); }
    } else if (type === 'handle') {
        try {
            const data = await fetchFromProxy('channels', {
                part: 'snippet,statistics,contentDetails',
                forHandle: value
            });
            if (data.items) items = data.items;
        } catch (e) { console.warn("Handle lookup warning:", e); }
    }

    // 2. Fallback to Search if direct lookup yielded no results
    if (items.length === 0) {
        try {
            const searchData = await fetchFromProxy('search', {
                part: 'id',
                q: value,
                type: 'channel',
                maxResults: '1'
            });

            if (searchData.items && searchData.items.length > 0) {
                const channelId = searchData.items[0].id.channelId;
                const detailsData = await fetchFromProxy('channels', {
                    part: 'snippet,statistics,contentDetails',
                    id: channelId
                });
                if (detailsData.items) items = detailsData.items;
            }
        } catch (error) {
            console.error("Search fallback failed:", error);
        }
    }

    if (!items || items.length === 0) throw new Error("Canal não encontrado.");

    const item = items[0];
    const todayLocal = new Date().toLocaleDateString('en-CA');

    // Prioritize high resolution thumbnail
    const avatarUrl = item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url;

    return {
        competitor: {
            id: item.id,
            channelName: item.snippet.title,
            influencerName: item.snippet.customUrl || item.snippet.title,
            channelUrl: `https://youtube.com/channel/${item.id}`,
            country: item.snippet.country || 'BR',
            youtubeJoinDate: item.snippet.publishedAt.split('T')[0],
        },
        stats: {
            date: todayLocal,
            subscribers: parseInt(item.statistics.subscriberCount || '0'),
            videos: parseInt(item.statistics.videoCount || '0'),
            views: parseInt(item.statistics.viewCount || '0')
        },
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
        avatarUrl: avatarUrl
    };
};

export const fetchVideoDetailsByIds = async (videoIds: string[]): Promise<VideoData[]> => {
    if (videoIds.length === 0) return [];

    const statsData = await fetchFromProxy('videos', {
        part: 'snippet,statistics',
        id: videoIds.join(',')
    });

    if (!statsData.items) return [];

    return statsData.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        commentCount: parseInt(item.statistics.commentCount || '0'),
        description: item.snippet.description
    }));
};

export const fetchCompetitorContent = async (channelUrl: string, knownChannelId?: string, channelName?: string): Promise<{ topVideos: VideoData[], recentVideos: VideoData[] }> => {
    try {
        let channelId = knownChannelId;

        if (channelId && !channelId.startsWith('UC')) {
            channelId = undefined;
        }

        if (!channelId) {
            const { type, value } = extractChannelIdentifier(channelUrl);

            const isUUID = value.length > 20 && value.includes('-') && !value.startsWith('UC');

            if (!isUUID) {
                let params: any = { part: 'id' };
                if (type === 'id') params.id = value;
                else params.forHandle = value;

                const channelData = await fetchFromProxy('channels', params);
                if (channelData.items?.[0]) {
                    channelId = channelData.items[0].id;
                }
            }

            if (!channelId && channelName) {
                const searchData = await fetchFromProxy('search', {
                    part: 'id',
                    q: channelName,
                    type: 'channel',
                    maxResults: '1'
                });
                if (searchData.items?.[0]) {
                    channelId = searchData.items[0].id.channelId;
                }
            }
        }

        if (!channelId || !channelId.startsWith('UC')) {
            console.error("Could not resolve a valid YouTube Channel ID");
            return { topVideos: [], recentVideos: [] };
        }

        let uploadsId = '';
        const chData = await fetchFromProxy('channels', {
            part: 'contentDetails',
            id: channelId
        });
        if (chData.items?.[0]) {
            uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;
        }

        let recentVideos: VideoData[] = [];
        if (uploadsId) {
            const playlistData = await fetchFromProxy('playlistItems', {
                part: 'snippet',
                playlistId: uploadsId,
                maxResults: '10'
            });

            if (playlistData.items) {
                const recentIds = playlistData.items.map((i: any) => i.snippet.resourceId.videoId);
                recentVideos = await fetchVideoDetailsByIds(recentIds);
            }
        }

        if (recentVideos.length === 0 && channelId) {
            const searchData = await fetchFromProxy('search', {
                part: 'id',
                channelId: channelId,
                order: 'date',
                maxResults: '10',
                type: 'video'
            });
            if (searchData.items) {
                const recentIds = searchData.items.map((i: any) => i.id.videoId);
                recentVideos = await fetchVideoDetailsByIds(recentIds);
            }
        }

        let topVideos: VideoData[] = [];
        if (channelId) {
            const searchData = await fetchFromProxy('search', {
                part: 'id',
                channelId: channelId,
                order: 'viewCount',
                maxResults: '10',
                type: 'video'
            });

            if (searchData.items) {
                const topIds = searchData.items.map((i: any) => i.id.videoId);
                topVideos = await fetchVideoDetailsByIds(topIds);
            }
        }

        return { topVideos, recentVideos };
    } catch (e) {
        console.error("Error fetching competitor content:", e);
        return { topVideos: [], recentVideos: [] };
    }
};

export const fetchTopVideosFromAnalytics = async (startDate: string, endDate: string): Promise<VideoData[]> => {
    let token = await getAccessToken();

    // If no token initially, just return empty, let the UI handle "Restricted" state
    if (!token) return [];

    const fetchAnalytics = async (authToken: string, metrics: string) => {
        const start = startDate.split('T')[0];
        const end = endDate.split('T')[0];
        const url = `${ANALYTICS_URL}?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=${metrics}&dimensions=video&sort=-views&maxResults=50`;
        return fetch(url, { headers: { 'Authorization': `Bearer ${authToken}` } });
    };

    let metrics = "views,estimatedMinutesWatched,estimatedRevenue,subscribersGained,likes,comments";
    let hasRevenue = true;
    let analyticsData: any = { rows: [] };

    try {
        let response = await fetchAnalytics(token, metrics);

        // --- RETRY LOGIC FOR 401 ---
        // If token invalid, try to force refresh once
        if (response.status === 401) {
            console.warn("Analytics 401 - Token possibly invalid. Attempting force refresh...");
            const newToken = await getAccessToken(true); // true = forceRefresh
            if (newToken) {
                console.log("Token refreshed successfully. Retrying request...");
                token = newToken;
                response = await fetchAnalytics(newToken, metrics);
            } else {
                console.error("Failed to refresh token during 401 handling.");
                return [];
            }
        }
        // ---------------------------

        if (!response.ok) {
            const err = await response.json();
            // Retry without revenue if permission error (403) or bad request (400)
            if (err.error?.code === 400 || err.error?.code === 403) {
                console.warn("Permission error on metrics, retrying without revenue...");
                metrics = "views,estimatedMinutesWatched,subscribersGained,likes,comments";
                hasRevenue = false;
                response = await fetchAnalytics(token!, metrics);

                // Handle 401 on retry as well, though less likely
                if (response.status === 401) return [];
            }
        }

        if (response.ok) {
            analyticsData = await response.json();
        } else {
            return [];
        }

        if (!analyticsData.rows || analyticsData.rows.length === 0) return [];

        const videoIds: string[] = [];
        const analyticsMap = new Map();

        analyticsData.rows.forEach((row: any[]) => {
            const id = row[0];
            videoIds.push(id);
            analyticsMap.set(id, {
                viewCount: row[1],
                estimatedMinutesWatched: row[2],
                subscribersGained: row[3],
                estimatedRevenue: hasRevenue ? row[4] : 0,
                likeCount: hasRevenue ? row[5] : row[4],
                commentCount: hasRevenue ? row[6] : row[5]
            });
        });

        // Use Proxy for Metadata
        const metaData = await fetchFromProxy('videos', {
            part: 'snippet,status',
            id: videoIds.join(',')
        });

        if (!metaData.items) return [];

        return metaData.items.map((item: any) => {
            const stats = analyticsMap.get(item.id);
            return {
                id: item.id,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                publishedAt: item.snippet.publishedAt,
                privacyStatus: item.status?.privacyStatus,
                description: item.snippet.description,
                ...stats
            };
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        return [];
    }
};

// --- NEW ANALYTICS FUNCTIONS ---

export const fetchVideoDemographics = async (videoId: string, startDate: string, endDate: string) => {
    const token = await getAccessToken();
    if (!token) return null;

    const start = startDate.split('T')[0];
    const end = endDate.split('T')[0];

    // Age Group
    const ageUrl = `${ANALYTICS_URL}?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=viewerPercentage&dimensions=ageGroup&filters=video==${videoId}&sort=ageGroup`;

    // Gender
    const genderUrl = `${ANALYTICS_URL}?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=viewerPercentage&dimensions=gender&filters=video==${videoId}&sort=gender`;

    try {
        const [ageRes, genderRes] = await Promise.all([
            fetch(ageUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(genderUrl, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const ageData = await ageRes.json();
        const genderData = await genderRes.json();

        return {
            age: ageData.rows || [],
            gender: genderData.rows || []
        };
    } catch (e) {
        console.error("Error fetching demographics:", e);
        return null;
    }
};

export const fetchVideoTrafficSources = async (videoId: string, startDate: string, endDate: string) => {
    const token = await getAccessToken();
    if (!token) return null;

    const start = startDate.split('T')[0];
    const end = endDate.split('T')[0];

    const url = `${ANALYTICS_URL}?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views&dimensions=insightTrafficSourceType&filters=video==${videoId}&sort=-views&maxResults=10`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        return data.rows || [];
    } catch (e) {
        console.error("Error fetching traffic sources:", e);
        return [];
    }
};

export const fetchVideoDailyMetrics = async (videoId: string, startDate: string, endDate: string) => {
    const token = await getAccessToken();
    if (!token) return null;

    const start = startDate.split('T')[0];
    const end = endDate.split('T')[0];

    // Try with revenue first
    let metrics = "views,estimatedMinutesWatched,estimatedRevenue,subscribersGained";
    let url = `${ANALYTICS_URL}?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=${metrics}&dimensions=day&filters=video==${videoId}&sort=day`;

    try {
        let res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

        if (!res.ok) {
            // Fallback without revenue
            metrics = "views,estimatedMinutesWatched,subscribersGained";
            url = `${ANALYTICS_URL}?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=${metrics}&dimensions=day&filters=video==${videoId}&sort=day`;
            res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        }

        const data = await res.json();
        return {
            rows: data.rows || [],
            hasRevenue: metrics.includes('estimatedRevenue')
        };
    } catch (e) {
        console.error("Error fetching daily metrics:", e);
        return { rows: [], hasRevenue: false };
    }
};

export const fetchVideosFromDb = async (channelId: string): Promise<VideoData[]> => {
    const res = await fetch(`${BASE_BACKEND_URL}/dashboard?channelId=${channelId}`);
    if (!res.ok) throw new Error("Erro ao buscar vídeos do banco de dados.");
    return await res.json();
};

export const fetchVideoDeepDiveFromDb = async (videoId: string): Promise<{ retention: any[], traffic: any[] }> => {
    const res = await fetch(`${BASE_BACKEND_URL}/video-details/${videoId}`);
    if (!res.ok) throw new Error("Erro ao buscar detalhes profundos do vídeo.");
    return await res.json();
};

export const triggerSync = async (channelId: string, includeDeepDive: boolean = true) => {
    const res = await fetch(`${BASE_BACKEND_URL.replace('/proxy', '')}/sync-detailed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, includeDeepDive })
    });
    if (!res.ok) throw new Error("Erro ao disparar sincronização.");
    return await res.json();
};

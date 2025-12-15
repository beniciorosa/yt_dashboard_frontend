
// --- START OF FILE services/storageService.ts ---
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { Competitor, StatSnapshot } from '../types';

// --- DATA LOGIC ---

const parseChannelIdField = (value: string | null) => {
  if (!value) return { influencer: '', country: '', isMyChannel: false, isHidden: false, isPinned: false, customUrl: '' };
  const parts = value.split('|');
  return {
    influencer: parts[0] || '',
    country: parts.length > 1 ? parts[1] : '',
    isMyChannel: parts.length > 2 ? parts[2] === 'true' : false,
    isHidden: parts.length > 3 ? parts[3] === 'true' : false,
    isPinned: parts.length > 4 ? parts[4] === 'true' : false,
    customUrl: parts.length > 5 ? parts[5] : ''
  };
};

const mapToCompetitor = (videoRow: any, metricsRows: any[]): Competitor => {
  const { influencer, country, isMyChannel, isHidden, isPinned, customUrl } = parseChannelIdField(videoRow.channel_id);
  const channelMetrics = metricsRows.filter(m => m.video_id === videoRow.id);

  const snapshots: StatSnapshot[] = channelMetrics.map((m: any) => ({
    id: m.id.toString(),
    date: m.date,
    createdAt: m.created_at,
    timeRegistered: m.time_registered,
    subscribers: m.likes || 0,
    videos: m.comments || 0,
    views: m.views || 0
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Use thumbnail_url as avatarUrl if it's an image link, else fallback
  const avatarUrl = videoRow.thumbnail_url;

  let channelLink = `https://youtube.com/channel/${videoRow.id}`;

  if (customUrl && customUrl.trim() !== '' && customUrl !== 'undefined') {
    const url = customUrl.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      channelLink = url;
    } else if (url.startsWith('@')) {
      channelLink = `https://www.youtube.com/${url}`;
    } else if (url.startsWith('UC') && url.length === 24) {
      channelLink = `https://www.youtube.com/channel/${url}`;
    } else {
      // Assume it's a handle without @
      channelLink = `https://www.youtube.com/@${url}`;
    }
  } else if (!videoRow.id.startsWith('UC')) {
    // If ID is a UUID (manual entry without API) and no customUrl is saved (legacy data),
    // try to use influencer name if it looks like a handle
    if (influencer && influencer.trim().startsWith('@')) {
      channelLink = `https://www.youtube.com/${influencer.trim()}`;
    } else {
      // fallback to searching by title so the link is not dead.
      channelLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(videoRow.title || '')}&sp=EgIQAg%253D%253D`;
    }
  }

  return {
    id: videoRow.id,
    channelName: videoRow.title || 'Sem Nome',
    influencerName: influencer,
    channelUrl: channelLink, // Uses customUrl or generated ID or search fallback
    country: country,
    youtubeJoinDate: videoRow.published_at || new Date().toISOString(),
    registrationDate: videoRow.last_sync || new Date().toISOString(),
    customCategory: videoRow.custom_category || '', // Ensure this is mapped correctly
    isMyChannel: isMyChannel,
    isHidden: isHidden,
    isPinned: isPinned,
    snapshots: snapshots,
    // Inject avatarUrl via type casting for now as it's not strictly in Competitor type
    // @ts-ignore
    avatarUrl: avatarUrl
  };
};

export const fetchCompetitors = async (): Promise<Competitor[]> => {
  try {
    const { data: videos, error: videosError } = await supabase
      .from('yt_videos')
      .select('*')
      .order('last_sync', { ascending: false });

    if (videosError) throw videosError;
    if (!videos || videos.length === 0) return [];

    const videoIds = videos.map(v => v.id);
    const { data: metrics, error: metricsError } = await supabase
      .from('yt_video_metrics_daily')
      .select('*')
      .in('video_id', videoIds);

    if (metricsError) throw metricsError;

    const allCompetitors = videos.map(v => mapToCompetitor(v, metrics || []));
    return allCompetitors.filter(c => !c.isHidden);

  } catch (error) {
    console.error("Error fetching competitors:", JSON.stringify(error, null, 2));
    return [];
  }
};

export const fetchMyChannel = async (): Promise<Competitor | null> => {
  try {
    const { data: videos, error: videosError } = await supabase
      .from('yt_videos')
      .select('*')
      .like('channel_id', '%|true%')
      .limit(1);

    if (videosError) throw videosError;
    if (!videos || videos.length === 0) return null;

    const myVideo = videos[0];
    const { data: metrics, error: metricsError } = await supabase
      .from('yt_video_metrics_daily')
      .select('*')
      .eq('video_id', myVideo.id);

    if (metricsError) throw metricsError;

    return mapToCompetitor(myVideo, metrics || []);
  } catch (error) {
    console.error("Error fetching my channel:", JSON.stringify(error, null, 2));
    return null;
  }
};

export const fetchCompetitorById = async (id: string): Promise<Competitor | null> => {
  try {
    const { data: video, error: videoError } = await supabase
      .from('yt_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (videoError) throw videoError;
    if (!video) return null;

    const { data: metrics, error: metricsError } = await supabase
      .from('yt_video_metrics_daily')
      .select('*')
      .eq('video_id', id);

    if (metricsError) throw metricsError;

    return mapToCompetitor(video, metrics || []);
  } catch (error) {
    console.error("Error fetching competitor:", JSON.stringify(error, null, 2));
    return null;
  }
};

// IMPROVED UPDATE FUNCTION
export const updateCompetitorCategory = async (competitorId: string, category: string) => {
  try {
    const { error } = await supabase
      .from('yt_videos')
      .update({ custom_category: category })
      .eq('id', competitorId);

    if (error) {
      console.error("Supabase Update Error:", JSON.stringify(error, null, 2));
      throw error;
    }
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

// Update Avatar
export const updateCompetitorAvatar = async (competitorId: string, avatarUrl: string) => {
  try {
    const { error } = await supabase
      .from('yt_videos')
      .update({ thumbnail_url: avatarUrl })
      .eq('id', competitorId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating avatar:", error);
    throw error;
  }
};

const getLocalDateString = () => new Date().toLocaleDateString('en-CA');
const getLocalTime = () => new Date().toLocaleTimeString('pt-BR', { hour12: false });

export const addCompetitor = async (competitorData: any, initialStats: any) => {
  try {
    // Check by ID first if available
    let existing;
    if (competitorData.id) {
      const { data } = await supabase.from('yt_videos').select('*').eq('id', competitorData.id).single();
      existing = data;
    } else {
      const { data } = await supabase.from('yt_videos').select('*').eq('thumbnail_url', competitorData.channelUrl).single();
      existing = data;
    }

    if (existing) {
      const { isHidden, isPinned, customUrl } = parseChannelIdField(existing.channel_id);

      // Update avatar if provided
      if (competitorData.avatarUrl && competitorData.avatarUrl !== existing.thumbnail_url) {
        await supabase.from('yt_videos').update({ thumbnail_url: competitorData.avatarUrl }).eq('id', existing.id);
      }

      if (isHidden) {
        const urlToUse = competitorData.channelUrl || customUrl;
        const restoredId = `${competitorData.influencerName}|${competitorData.country}|${competitorData.isMyChannel}|false|${isPinned}|${urlToUse}`;
        await supabase.from('yt_videos').update({ channel_id: restoredId }).eq('id', existing.id);
        return existing;
      }
      return existing;
    }

    const newId = competitorData.id || crypto.randomUUID();
    const urlToStore = competitorData.channelUrl || '';
    const compositeId = `${competitorData.influencerName}|${competitorData.country}|${competitorData.isMyChannel}|false|false|${urlToStore}`;
    const time = getLocalTime();

    const thumbnailToSave = competitorData.avatarUrl || competitorData.channelUrl;

    const { data: video, error: videoError } = await supabase
      .from('yt_videos')
      .insert({
        id: newId,
        title: competitorData.channelName,
        channel_id: compositeId,
        thumbnail_url: thumbnailToSave,
        published_at: competitorData.youtubeJoinDate,
        last_sync: new Date().toISOString(),
        time_registered: time
      })
      .select()
      .single();

    if (videoError) throw videoError;

    const today = getLocalDateString();
    const { error: metricsError } = await supabase
      .from('yt_video_metrics_daily')
      .insert({
        video_id: newId,
        date: today,
        views: initialStats.views,
        likes: initialStats.subscribers,
        comments: initialStats.videos,
        time_registered: time
      });

    if (metricsError) throw metricsError;
    return video;
  } catch (error) {
    console.error("Error adding competitor:", error);
    throw error;
  }
};

export const addSnapshot = async (competitorId: string, stats: any) => {
  try {
    const dateStr = stats.date || getLocalDateString();
    const currentTime = getLocalTime();

    const { error } = await supabase
      .from('yt_video_metrics_daily')
      .upsert({
        video_id: competitorId,
        date: dateStr,
        views: stats.views,
        likes: stats.subscribers,
        comments: stats.videos,
        created_at: new Date().toISOString(),
        time_registered: currentTime
      }, { onConflict: 'video_id, date' });

    if (error) throw error;
  } catch (error) {
    console.error("Error adding snapshot:", error);
    throw error;
  }
};

export const deleteSnapshot = async (snapshotId: string) => {
  try {
    const { error } = await supabase
      .from('yt_video_metrics_daily')
      .delete()
      .eq('id', snapshotId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting snapshot:", error);
    throw error;
  }
};

export const toggleCompetitorVisibility = async (competitorId: string, hide: boolean) => {
  try {
    const { data: video } = await supabase.from('yt_videos').select('channel_id').eq('id', competitorId).single();
    if (!video) return;

    const { influencer, country, isMyChannel, isPinned, customUrl } = parseChannelIdField(video.channel_id);
    const newComposite = `${influencer}|${country}|${isMyChannel}|${hide}|${isPinned}|${customUrl}`;

    const { error } = await supabase
      .from('yt_videos')
      .update({ channel_id: newComposite })
      .eq('id', competitorId);

    if (error) throw error;
  } catch (error) {
    console.error("Error toggling visibility:", error);
    throw error;
  }
};

export const toggleCompetitorPin = async (competitorId: string) => {
  try {
    const { data: video } = await supabase.from('yt_videos').select('channel_id').eq('id', competitorId).single();
    if (!video) return;

    const { influencer, country, isMyChannel, isHidden, isPinned, customUrl } = parseChannelIdField(video.channel_id);
    const newComposite = `${influencer}|${country}|${isMyChannel}|${isHidden}|${!isPinned}|${customUrl}`;

    const { error } = await supabase
      .from('yt_videos')
      .update({ channel_id: newComposite })
      .eq('id', competitorId);

    if (error) throw error;
  } catch (error) {
    console.error("Error toggling pin:", error);
    throw error;
  }
};

export const deleteCompetitor = async (competitorId: string) => {
  try {
    await supabase.from('yt_video_metrics_daily').delete().eq('video_id', competitorId);
    const { error } = await supabase.from('yt_videos').delete().eq('id', competitorId);
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting competitor:", error);
    throw error;
  }
};

export const verifyUserAccess = async (userId: string, email: string): Promise<boolean> => {
  try {
    // Init temp client for auth check using keys from SupabaseAdm configuration
    // Init temp client for auth check using keys from SupabaseAdm configuration
    const authClient = createClient(
      'https://qytuhvqggsleohxndtqz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dHVodnFnZ3NsZW9oeG5kdHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcwODIxNSwiZXhwIjoyMDc5Mjg0MjE1fQ.5liB1hAHSCezVFRQvlIL7rnPfMrVQKv17dte09bXzb4',
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // Try to find the user by UUID and email in a 'users' table
    const { data, error } = await authClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.warn("Auth verify error (ignoring if just missing row):", error);
    }

    // If row found, access granted
    return !!data;
  } catch (e) {
    console.error("Auth verification failed", e);
    return false;
  }
};

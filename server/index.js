import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO DE AMBIENTE ---
const PORT = process.env.PORT || 8080;

// Supabase - RESTORED ORIGINAL CREDENTIALS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qytuhvqggsleohxndtqz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dHVodnFnZ3NsZW9oeG5kdHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcwODIxNSwiZXhwIjoyMDc5Mjg0MjE1fQ.5liB1hAHSCezVFRQvlIL7rnPfMrVQKv17dte09bXzb4';

// APIs Externas
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBYsoVEnQ9vwQUF4Y0Tf2yCyrx678CKbMo';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'SUA_GEMINI_KEY';

// OAuth Credentials
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || '271641116604-ghj5qe7mlpfq9qu8prk31seavncelkpc.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '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';
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'https://yt-escalada-analytics-271641116604.us-west1.run.app';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- HELPERS ---
const parseChannelIdField = (value) => {
  if (!value) return { influencer: '', country: '', isMyChannel: false, isHidden: false, isPinned: false };
  const parts = value.split('|');
  return { 
    influencer: parts[0] || '', 
    country: parts.length > 1 ? parts[1] : '',
    isMyChannel: parts.length > 2 ? parts[2] === 'true' : false,
    isHidden: parts.length > 3 ? parts[3] === 'true' : false,
    isPinned: parts.length > 4 ? parts[4] === 'true' : false
  };
};

// --- ROTAS DE DADOS (DB) ---

app.get('/api/competitors', async (req, res) => {
  try {
    const { data: videos } = await supabase.from('yt_videos').select('*').order('last_sync', { ascending: false });
    if (!videos) return res.json([]);

    const videoIds = videos.map(v => v.id);
    const { data: metrics } = await supabase.from('yt_video_metrics_daily').select('*').in('video_id', videoIds);

    const competitors = videos.map(videoRow => {
        const { influencer, country, isMyChannel, isHidden, isPinned } = parseChannelIdField(videoRow.channel_id);
        const channelMetrics = (metrics || []).filter(m => m.video_id === videoRow.id);
        
        const snapshots = channelMetrics.map(m => ({
            id: m.id.toString(),
            date: m.date,
            createdAt: m.created_at,
            timeRegistered: m.time_registered,
            subscribers: m.likes || 0,
            videos: m.comments || 0,
            views: m.views || 0
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            id: videoRow.id,
            channelName: videoRow.title,
            influencerName: influencer,
            channelUrl: videoRow.thumbnail_url,
            country: country,
            youtubeJoinDate: videoRow.published_at,
            registrationDate: videoRow.last_sync,
            customCategory: videoRow.custom_category,
            isMyChannel, isHidden, isPinned, snapshots
        };
    }).filter(c => !c.isHidden);

    res.json(competitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-channel', async (req, res) => {
    try {
        const { data: videos } = await supabase.from('yt_videos').select('*').like('channel_id', '%|true%').limit(1);
        if (!videos || videos.length === 0) return res.json(null);
        
        const myVideo = videos[0];
        const { data: metrics } = await supabase.from('yt_video_metrics_daily').select('*').eq('video_id', myVideo.id);
        
        const { influencer, country, isMyChannel, isHidden, isPinned } = parseChannelIdField(myVideo.channel_id);
        const snapshots = (metrics || []).map(m => ({
            id: m.id.toString(),
            date: m.date,
            createdAt: m.created_at,
            timeRegistered: m.time_registered,
            subscribers: m.likes || 0,
            videos: m.comments || 0,
            views: m.views || 0
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        res.json({
            id: myVideo.id,
            channelName: myVideo.title,
            influencerName: influencer,
            channelUrl: myVideo.thumbnail_url,
            country: country,
            youtubeJoinDate: myVideo.published_at,
            registrationDate: myVideo.last_sync,
            isMyChannel, isHidden, isPinned, snapshots
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generic proxy endpoints for DB writes
app.post('/api/competitors', async (req, res) => {
    res.status(501).json({error: "Endpoint to be fully implemented on backend logic"});
});

// --- YOUTUBE PROXY ---
app.get('/api/youtube/data', async (req, res) => {
    const url = req.url.replace('/api/youtube/data', 'https://www.googleapis.com/youtube/v3');
    const finalUrl = url + (url.includes('?') ? '&' : '?') + `key=${YOUTUBE_API_KEY}`;
    try {
        const resp = await fetch(finalUrl);
        const data = await resp.json();
        res.status(resp.status).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SERVE FRONTEND (PRODUCTION) ---
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
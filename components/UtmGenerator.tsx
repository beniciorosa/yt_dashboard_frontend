import React, { useState, useEffect, useRef } from 'react';
import { InputGroup } from './UtmInputGroup';
import {
    Link2, Youtube, Calendar, Settings2, Sparkles, Copy, Check, ExternalLink,
    AlertCircle, Zap, Save, History, Trash2, Clock, ChevronDown, X, ArrowRight,
    FolderHeart, FileEdit, Eraser, Search, Loader2, MessageSquareText, ChevronUp, RefreshCw,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getAccessToken, initiateLogin } from '../services/authService';

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://yt-dashboard-backend.vercel.app');

interface UTMParams {
    source: string;
    medium: string;
    campaign: string;
    term: string;
}

interface SavedDestination {
    alias: string;
    url: string;
}

interface VideoMetadata {
    video_id: string;
    title: string;
    published_at: string;
    thumbnail_url: string;
    description?: string;
}

interface VideoStats {
    views: string;
    likes: string;
    comments: string;
}

interface SavedSession {
    id: string;
    type: 'draft' | 'auto';
    timestamp: number;
    title: string;
    date: string;
    baseUrl: string;
    slug: string;
    utmParams: UTMParams;
    generatedLink: string;
    shortLink: string;
    video_id?: string;
    video_url?: string;
}

const DEFAULT_UTM = {
    source: 'YT-ORG',
    medium: 'YT-ORG',
    campaign: 'MEN25',
    term: 'YT-ORG',
};

const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getFormattedDateForSlug = (dateString: string) => {
    if (!dateString) return '';
    // Fix: Parse string directly to avoid timezone issues (YYYY-MM-DD)
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return '';
    return `${day}${month}${year.slice(-2)}`;
};

const parseTimestamp = (dateString: string | null | undefined): number => {
    if (!dateString) return Date.now();
    const date = new Date(dateString);
    const time = date.getTime();
    if (isNaN(time) || time < 86400000) return Date.now();
    return time;
};

export const UtmGenerator: React.FC = () => {
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const [title, setTitle] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [date, setDate] = useState(getTodayString());

    const [videoId, setVideoId] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    const [slug, setSlug] = useState('');
    const [utmParams, setUtmParams] = useState<UTMParams>(DEFAULT_UTM);
    const [generatedLink, setGeneratedLink] = useState('');
    const [shortLink, setShortLink] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [isShortening, setIsShortening] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [shortCopySuccess, setShortCopySuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Video Search State
    const [videoSearch, setVideoSearch] = useState('');
    const [videoResults, setVideoResults] = useState<VideoMetadata[]>([]);
    const [isSearchingVideos, setIsSearchingVideos] = useState(false);
    const [showVideoDropdown, setShowVideoDropdown] = useState(false);

    // Description State
    const [showDescription, setShowDescription] = useState(false);
    const [description, setDescription] = useState('');
    const [isHistoryLoadingDescription, setIsHistoryLoadingDescription] = useState(false);
    const [isLoadingFromYoutube, setIsLoadingFromYoutube] = useState(false);
    const [isSavingDescription, setIsSavingDescription] = useState(false);
    const [videoLinksHistory, setVideoLinksHistory] = useState<any[]>([]);
    const [isLoadingVideoHistory, setIsLoadingVideoHistory] = useState(false);
    const [videoCategoryId, setVideoCategoryId] = useState('27');
    const [allVideos, setAllVideos] = useState<VideoMetadata[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [videoStats, setVideoStats] = useState<VideoStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([]);
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [showUrlDropdown, setShowUrlDropdown] = useState(false);
    const [isSavingUrl, setIsSavingUrl] = useState(false);
    const [newUrlAlias, setNewUrlAlias] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);
    const videoSearchRef = useRef<HTMLDivElement>(null);
    const isLoadingSessionRef = useRef(false);
    const isNavigatingRef = useRef(false);

    useEffect(() => {
        const storedUrls = localStorage.getItem('yt_utm_saved_urls');
        if (storedUrls) {
            try {
                const parsed = JSON.parse(storedUrls);
                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                    const converted = parsed.map((url: string) => ({ alias: 'Link Salvo', url }));
                    setSavedDestinations(converted);
                } else {
                    setSavedDestinations(parsed);
                }
            } catch (e) { }
        }
        loadDrafts();
        fetchAllVideos();
    }, []);

    const fetchAllVideos = async () => {
        try {
            const { data, error } = await supabase
                .from('yt_myvideos')
                .select('video_id, title, published_at, thumbnail_url, description')
                .order('published_at', { ascending: true });

            if (error) throw error;
            setAllVideos(data || []);
        } catch (e) {
            console.error("Erro ao buscar lista completa de vídeos:", e);
        }
    };

    const handleDeleteLink = async (id: string, slug: string) => {
        if (!confirm(`Tem certeza que deseja apagar o link "${slug}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('yt_links')
                .delete()
                .eq('id', id);

            if (!error) {
                // Update local state by filtering out the deleted link
                setVideoLinksHistory(prev => prev.filter(link => link.id !== id));
            } else {
                alert('Erro ao apagar o link: ' + error.message);
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            alert('Erro de conexão ao apagar o link.');
        }
    };

    const loadDrafts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/utm/links`);
            if (!res.ok) return;
            const data = await res.json();

            const mappedSessions: SavedSession[] = data.map((item: any) => {
                let extractedUtms = { ...DEFAULT_UTM };
                if (item.final_url) {
                    try {
                        const urlObj = new URL(item.final_url);
                        extractedUtms = {
                            source: urlObj.searchParams.get('utm_source') || DEFAULT_UTM.source,
                            medium: urlObj.searchParams.get('utm_medium') || DEFAULT_UTM.medium,
                            campaign: urlObj.searchParams.get('utm_campaign') || DEFAULT_UTM.campaign,
                            term: urlObj.searchParams.get('utm_term') || DEFAULT_UTM.term,
                        };
                    } catch (e) { }
                }

                return {
                    id: item.id,
                    type: item.is_draft ? 'draft' : 'auto',
                    timestamp: parseTimestamp(item.created_at),
                    title: item.title || '',
                    date: item.publish_date || '',
                    baseUrl: item.base_url || '',
                    slug: item.slug || '',
                    utmParams: extractedUtms,
                    generatedLink: item.final_url || '',
                    shortLink: item.short_url || '',
                    video_id: item.video_id,
                    video_url: item.video_url
                };
            });
            setSessions(mappedSessions);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // URL Dropdown logic
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUrlDropdown(false);
                setIsSavingUrl(false);
            }
            // Video Search Dropdown logic
            if (videoSearchRef.current && !videoSearchRef.current.contains(event.target as Node)) {
                setShowVideoDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isNavigatingRef.current) {
            isNavigatingRef.current = false;
            return;
        }
        const timer = setTimeout(() => {
            searchVideos();
        }, 500);
        return () => clearTimeout(timer);
    }, [videoSearch]);

    const searchVideos = async () => {
        if (!videoSearch) {
            setVideoResults([]);
            return;
        }

        // Search by Index Pattern (n3, n200, etc)
        const nMatch = videoSearch.match(/^n(\d+)$/i);
        if (nMatch) {
            const index = parseInt(nMatch[1]) - 1;
            if (index >= 0 && index < allVideos.length) {
                handleSelectVideo(allVideos[index]);
                setVideoSearch('');
                return;
            }
        }

        if (videoSearch.length < 2) {
            setVideoResults([]);
            return;
        }

        setIsSearchingVideos(true);
        try {
            const { data, error } = await supabase
                .from('yt_myvideos')
                .select('video_id, title, published_at, thumbnail_url, description')
                .or(`title.ilike.%${videoSearch}%,video_id.eq.${videoSearch}`)
                .limit(10);

            if (error) throw error;
            setVideoResults(data || []);
            setShowVideoDropdown(true);
        } catch (e) {
            console.error("Erro ao buscar vídeos:", e);
        } finally {
            setIsSearchingVideos(false);
        }
    };

    const fetchVideoStats = async (vidId: string) => {
        setIsLoadingStats(true);
        try {
            // OPTIMIZATION: Fetch stats from Supabase instead of YouTube API Proxy
            // This table is already synced by the backend, saving 1 quota unit per selection.
            const { data, error } = await supabase
                .from('yt_myvideos')
                .select('view_count, like_count, comment_count')
                .eq('video_id', vidId)
                .single();

            if (data) {
                setVideoStats({
                    views: data.view_count?.toString() || '0',
                    likes: data.like_count?.toString() || '0',
                    comments: data.comment_count?.toString() || '0'
                });
            } else {
                if (error) console.error("Erro ao buscar no Supabase:", error);
                setVideoStats(null);
            }
        } catch (e) {
            console.error("Erro ao carregar estatísticas do banco:", e);
            setVideoStats(null);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleSelectVideo = (video: VideoMetadata) => {
        setTitle(video.title);
        setVideoId(video.video_id);
        setVideoUrl(`https://www.youtube.com/watch?v=${video.video_id}`);
        setVideoSearch(video.title);
        setDescription(video.description || '');

        if (video.published_at) {
            try {
                const pubDate = new Date(video.published_at);
                const yyyy = pubDate.getFullYear();
                const mm = String(pubDate.getMonth() + 1).padStart(2, '0');
                const dd = String(pubDate.getDate()).padStart(2, '0');
                setDate(`${yyyy}-${mm}-${dd}`);
            } catch (e) { }
        }

        setShowVideoDropdown(false);
        setShowDescription(true);
        setSlug('');
        setShortLink('');
        setGeneratedLink('');
        fetchVideoLinksHistory(video.video_id);
        fetchVideoStats(video.video_id);

        // Find index in allVideos to set global numbering
        const index = allVideos.findIndex(v => v.video_id === video.video_id);
        setCurrentIndex(index);
    };

    const navigateVideo = (direction: 'next' | 'prev') => {
        if (allVideos.length === 0) return;
        let newIndex = currentIndex;
        if (direction === 'next' && currentIndex < allVideos.length - 1) {
            newIndex = currentIndex + 1;
        } else if (direction === 'prev' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        }

        if (newIndex !== currentIndex) {
            isNavigatingRef.current = true;
            handleSelectVideo(allVideos[newIndex]);
        }
    };

    const fetchVideoLinksHistory = async (vidId: string) => {
        setIsLoadingVideoHistory(true);
        try {
            const { data, error } = await supabase
                .from('yt_links')
                .select('id, created_at, short_url, slug')
                .eq('video_id', vidId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVideoLinksHistory(data || []);
        } catch (e) {
            console.error("Erro ao buscar histórico do vídeo:", e);
        } finally {
            setIsLoadingVideoHistory(false);
        }
    };

    const confirmSaveUrl = () => {
        if (!baseUrl || !newUrlAlias) return;
        const newEntry: SavedDestination = { alias: newUrlAlias, url: baseUrl };
        const existingIndex = savedDestinations.findIndex(d => d.url === baseUrl);
        let newDestinations;
        if (existingIndex >= 0) {
            newDestinations = [...savedDestinations];
            newDestinations[existingIndex] = newEntry;
        } else {
            newDestinations = [...savedDestinations, newEntry];
        }
        setSavedDestinations(newDestinations);
        localStorage.setItem('yt_utm_saved_urls', JSON.stringify(newDestinations));
        setIsSavingUrl(false);
        setNewUrlAlias('');
        setShowUrlDropdown(false);
    };

    const deleteUrlFromStorage = (urlToDelete: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newDestinations = savedDestinations.filter(d => d.url !== urlToDelete);
        setSavedDestinations(newDestinations);
        localStorage.setItem('yt_utm_saved_urls', JSON.stringify(newDestinations));
    };

    const saveSession = async (type: 'draft' | 'auto' = 'draft') => {
        if (!title && type === 'draft') {
            setError("Preencha pelo menos o título para salvar o rascunho.");
            return;
        }
        if (!title && type === 'auto') return;

        let shortCode = null;
        if (shortLink) {
            try {
                const urlObj = new URL(shortLink);
                shortCode = urlObj.pathname.replace(/^\//, '');
            } catch (e) { shortCode = shortLink.split('/').pop() || null; }
        }

        const payload = {
            title,
            publish_date: date || null,
            base_url: baseUrl,
            slug,
            utm_content: slug,
            final_url: generatedLink,
            short_url: shortLink || null,
            short_code: shortCode,
            is_draft: type === 'draft',
            video_id: videoId || null,
            video_url: videoUrl || null
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/utm/links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Falha ao salvar");

            await loadDrafts();
            if (type === 'draft') {
                setError(null);
                setShowHistory(true);
            }
        } catch (e: any) { setError(`Erro ao salvar: ${e.message}`); }
    };

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`${API_BASE_URL}/api/utm/links/${id}`, { method: 'DELETE' });
            setSessions(prev => prev.filter(s => s.id !== id));
        } catch (e) { console.error("Erro ao deletar", e); }
    };

    const handleAiGenerate = async () => {
        if (!title) { setError("Por favor, insira um título de vídeo."); return; }
        setError(null);
        setIsGenerating(true);
        setShortLink('');

        const formattedDate = getFormattedDateForSlug(date);

        // New Format: YT-DATA-ID-TITULO
        // Prefix: yt-191225-Na2KJzVWnP8
        const prefix = `yt-${formattedDate}${videoId ? `-${videoId}` : ''}`;

        try {
            const res = await fetch(`${API_BASE_URL}/api/utm/slug`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title })
            });

            if (!res.ok) throw new Error("Erro na API ao gerar slug");
            const data = await res.json();
            let textSlug = data.slug || "video";

            setSlug(`${prefix}-${textSlug}`);
        } catch (e) {
            console.warn(e);
            setError("Erro inesperado. Slug básico gerado (fallback).");
            setSlug(`${prefix}-video`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShortenLink = async () => {
        if (!generatedLink) return;
        setIsShortening(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/utm/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalURL: generatedLink,
                    slug: slug,
                    title: title
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Erro desconhecido ao encurtar");

            setShortLink(data.shortUrl);

            // Auto save logic
            let shortCode = null;
            try {
                const urlObj = new URL(data.shortUrl);
                shortCode = urlObj.pathname.replace(/^\//, '');
            } catch (e) { shortCode = data.shortUrl.split('/').pop() || null; }

            const payload = {
                title,
                publish_date: date || null,
                base_url: baseUrl,
                slug,
                utm_content: slug,
                final_url: generatedLink,
                short_url: data.shortUrl,
                short_code: shortCode,
                is_draft: false,
                video_id: videoId || null,
                video_url: videoUrl || null
            };

            await fetch(`${API_BASE_URL}/api/utm/links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            await loadDrafts();

        } catch (e: any) { setError(e.message || "Erro ao encurtar"); }
        finally { setIsShortening(false); }
    };

    const loadSession = (session: SavedSession) => {
        isLoadingSessionRef.current = true;
        setTitle(session.title);
        setDate(session.date);
        setBaseUrl(session.baseUrl);
        setSlug(session.slug);
        setUtmParams(session.utmParams);
        setGeneratedLink(session.generatedLink);
        setShortLink(session.shortLink);
        setVideoId(session.video_id || '');
        setVideoUrl(session.video_url || '');
        setVideoSearch(session.title || '');
        setShowHistory(false);
        setError(null);
        setTimeout(() => { isLoadingSessionRef.current = false; }, 200);
    };

    const clearForm = () => {
        setGeneratedLink('');
        setShortLink('');
        setVideoId('');
        setVideoUrl('');
        setVideoSearch('');
        setDescription('');
        setVideoLinksHistory([]);
        setShowDescription(false);
        setError(null);
    };

    useEffect(() => {
        if (!baseUrl) {
            setGeneratedLink('');
            if (!isLoadingSessionRef.current) setShortLink('');
            return;
        }
        try {
            const url = new URL(baseUrl);
            url.searchParams.set('utm_source', utmParams.source);
            url.searchParams.set('utm_medium', utmParams.medium);
            url.searchParams.set('utm_campaign', utmParams.campaign);
            url.searchParams.set('utm_term', utmParams.term);
            if (slug) url.searchParams.set('utm_content', slug);
            const newLink = url.toString();
            if (newLink !== generatedLink) {
                setGeneratedLink(newLink);
                if (shortLink && !isLoadingSessionRef.current) setShortLink('');
            }
        } catch (e) { setGeneratedLink(''); }
    }, [slug, baseUrl, utmParams]);

    const copyToClipboard = (text: string, setSuccess: (v: boolean) => void) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
    };

    const loadDescriptionFromYoutube = async () => {
        if (!videoId) return;
        setIsLoadingFromYoutube(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/youtube/proxy?endpoint=videos&part=snippet&id=${videoId}`);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const fullDesc = data.items[0].snippet.description;
                setDescription(fullDesc);
                if (data.items[0].snippet.categoryId) {
                    setVideoCategoryId(data.items[0].snippet.categoryId);
                }
            }
        } catch (e) {
            console.error("Erro ao carregar descrição:", e);
        } finally {
            setIsLoadingFromYoutube(false);
        }
    };

    const saveDescriptionToDatabase = async () => {
        if (!videoId) return;
        setIsSavingDescription(true);
        setError(null);
        try {
            // 1. Update Supabase
            const { error: supabaseError } = await supabase
                .from('yt_myvideos')
                .update({ description })
                .eq('video_id', videoId);

            if (supabaseError) throw supabaseError;

            // 2. Update YouTube (if token available or after login)
            const token = await getAccessToken();
            if (!token) {
                // If not authenticated, we could trigger login or just warn
                // But user wants a redirect ONLY if clicking save and not logged in
                initiateLogin();
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/youtube/proxy-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    method: 'PUT',
                    endpoint: 'videos',
                    params: { part: 'snippet' },
                    data: {
                        id: videoId,
                        snippet: {
                            title: title, // YouTube requires title in snippet for update
                            categoryId: videoCategoryId,
                            description: description
                        }
                    }
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Falha ao atualizar no YouTube");
            }

            alert("Descrição salva com sucesso no banco e no YouTube!");
        } catch (e: any) {
            console.error("Erro ao salvar descrição:", e);
            setError(`Erro ao salvar: ${e.message}`);
        } finally {
            setIsSavingDescription(false);
        }
    };

    return (
        <div className="relative h-full flex flex-col font-sans transition-colors duration-200">
            {/* Main Content Area */}
            <div className={`flex-1 transition-all duration-300 ${showHistory ? 'mr-80' : ''}`}>
                <div className="flex justify-center pb-8 p-4 sm:p-6 lg:p-8">
                    <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-gray-700 flex flex-col">

                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    <Youtube className="w-8 h-8" />
                                    Gerador de Links
                                </h1>
                                <p className="text-indigo-100 text-sm mt-1 opacity-90">
                                    Utilitário para campanhas
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={clearForm} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors" title="Limpar Campos">
                                    <Eraser className="w-5 h-5" />
                                </button>
                                <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'}`} title="Histórico Salvo">
                                    <History className="w-5 h-5" />
                                </button>
                                <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors" title="Configurações">
                                    <Settings2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Settings Panel */}
                        {showSettings && (
                            <div className="bg-slate-50 dark:bg-gray-750 border-b border-slate-200 dark:border-gray-700 p-6 animate-in slide-in-from-top-2 shrink-0">
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-4">Configurações Avançadas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputGroup label="UTM Source" value={utmParams.source} onChange={(e) => setUtmParams({ ...utmParams, source: e.target.value })} />
                                    <InputGroup label="UTM Medium" value={utmParams.medium} onChange={(e) => setUtmParams({ ...utmParams, medium: e.target.value })} />
                                    <InputGroup label="UTM Campaign" value={utmParams.campaign} onChange={(e) => setUtmParams({ ...utmParams, campaign: e.target.value })} />
                                    <InputGroup label="UTM Term" value={utmParams.term} onChange={(e) => setUtmParams({ ...utmParams, term: e.target.value })} />
                                </div>
                            </div>
                        )}

                        <div className="p-6 space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                {/* Video Search Field */}
                                <div className="md:col-span-12 relative" ref={videoSearchRef}>
                                    <label className="text-sm font-medium text-slate-700 dark:text-gray-300 flex items-center gap-2 mb-1.5">
                                        <Search className="w-4 h-4" />
                                        Buscar Vídeo do Canal
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={videoSearch}
                                            onChange={(e) => setVideoSearch(e.target.value)}
                                            onFocus={() => videoResults.length > 0 && setShowVideoDropdown(true)}
                                            placeholder="Título, URL ou ID do vídeo..."
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white pr-10"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {isSearchingVideos ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Search className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </div>

                                    {showVideoDropdown && videoResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto">
                                            {videoResults.map((video) => (
                                                <div
                                                    key={video.video_id}
                                                    onClick={() => handleSelectVideo(video)}
                                                    className="p-3 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer flex gap-3 border-b border-slate-50 dark:border-gray-700 last:border-0"
                                                >
                                                    <img src={video.thumbnail_url} className="w-16 h-9 rounded object-cover shrink-0" alt="" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">{video.title}</div>
                                                        <div className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                                            <Youtube className="w-3 h-3" /> {video.video_id}
                                                            <span className="opacity-50">|</span>
                                                            <Calendar className="w-3 h-3" /> {new Date(video.published_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Video Stats Card */}
                                    {videoId && (
                                        <div className="mt-4 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-gray-700">
                                                <div className="sm:w-1/3 relative group aspect-video sm:aspect-auto">
                                                    <img src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
                                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        alt="Video Thumbnail" />
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                        <div className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                                            <Youtube className="w-6 h-6 text-red-600" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 p-5 space-y-4">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 line-clamp-2 leading-tight mb-2 min-h-[3.25rem]">
                                                            {title}
                                                        </h3>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
                                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                                            <span className="opacity-30">|</span>
                                                            <span className="flex items-center gap-1 font-mono uppercase bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded tracking-wider">{videoId}</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center gap-1 overflow-hidden">
                                                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 mb-0.5">
                                                                <ExternalLink className="w-4 h-4" />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Views</span>
                                                            </div>
                                                            {isLoadingStats ? (
                                                                <div className="h-5 w-12 bg-slate-100 dark:bg-gray-700 animate-pulse rounded" />
                                                            ) : (
                                                                <span className="text-sm font-black text-slate-800 dark:text-gray-100">
                                                                    {videoStats?.views ? parseInt(videoStats.views).toLocaleString('pt-BR') : '---'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center gap-1 overflow-hidden">
                                                            <div className="flex items-center gap-1.5 text-rose-500 mb-0.5">
                                                                <FolderHeart className="w-4 h-4" />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Likes</span>
                                                            </div>
                                                            {isLoadingStats ? (
                                                                <div className="h-5 w-12 bg-slate-100 dark:bg-gray-700 animate-pulse rounded" />
                                                            ) : (
                                                                <span className="text-sm font-black text-slate-800 dark:text-gray-100">
                                                                    {videoStats?.likes ? parseInt(videoStats.likes).toLocaleString('pt-BR') : '---'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center gap-1 overflow-hidden">
                                                            <div className="flex items-center gap-1.5 text-emerald-500 mb-0.5">
                                                                <MessageSquareText className="w-4 h-4" />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Comments</span>
                                                            </div>
                                                            {isLoadingStats ? (
                                                                <div className="h-5 w-12 bg-slate-100 dark:bg-gray-700 animate-pulse rounded" />
                                                            ) : (
                                                                <span className="text-sm font-black text-slate-800 dark:text-gray-100">
                                                                    {videoStats?.comments ? parseInt(videoStats.comments).toLocaleString('pt-BR') : '---'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Video History Section */}
                                    {videoLinksHistory.length > 0 && (
                                        <div className="mt-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/50">
                                            <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <History className="w-3.5 h-3.5" /> Links já gerados para este vídeo
                                            </h4>
                                            <div className="space-y-2">
                                                {videoLinksHistory.map((h, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-indigo-50 dark:border-gray-700 shadow-sm">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-gray-200 truncate max-w-[200px]">{h.slug}</span>
                                                            <span className="text-[10px] text-slate-500 dark:text-gray-400">{new Date(h.created_at).toLocaleDateString('pt-BR')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{h.short_url}</span>
                                                            <div className="flex items-center bg-slate-50 dark:bg-gray-700/50 rounded-md border border-slate-200 dark:border-gray-600 p-0.5">
                                                                <button
                                                                    onClick={() => copyToClipboard(h.short_url, setShortCopySuccess)}
                                                                    className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded text-indigo-600 dark:text-indigo-400 transition-colors"
                                                                    title="Copiar Link"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div className="w-[1px] h-3 bg-slate-300 dark:bg-gray-600 mx-0.5" />
                                                                <button
                                                                    onClick={() => handleDeleteLink(h.id, h.slug)}
                                                                    className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded text-rose-500 dark:text-rose-400 transition-colors"
                                                                    title="Apagar Link"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-12">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        <div className="md:col-span-8">
                                            <InputGroup
                                                label="Título do Vídeo"
                                                icon={<FileEdit className="w-4 h-4" />}
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Ex: R$1 milhão por mês no TikTok Shop"
                                                rightLabel={currentIndex !== -1 && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                            VÍDEO {currentIndex + 1}
                                                        </div>
                                                        <div className="flex items-center bg-slate-100 dark:bg-gray-700 rounded-lg p-0.5 border border-slate-200 dark:border-gray-600">
                                                            <button onClick={() => navigateVideo('prev')} disabled={currentIndex <= 0} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                                                <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-gray-300" />
                                                            </button>
                                                            <div className="w-[1px] h-3 bg-slate-300 dark:bg-gray-600 mx-0.5" />
                                                            <button onClick={() => navigateVideo('next')} disabled={currentIndex >= allVideos.length - 1} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-gray-300" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <InputGroup label="Data de Publicação" type="date" value={date} onChange={(e) => setDate(e.target.value)} icon={<Calendar className="w-4 h-4" />} />
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-6">
                                    <InputGroup label="ID do Vídeo" value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="Ex: Na2KJzVWnP8" icon={<Youtube className="w-4 h-4" />} />
                                </div>
                                <div className="md:col-span-6">
                                    <InputGroup label="URL do Vídeo" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Ex: https://youtube.com/..." icon={<Youtube className="w-4 h-4" />} />
                                </div>

                                <div className="md:col-span-12 relative" ref={dropdownRef}>
                                    <label className="text-sm font-medium text-slate-700 dark:text-gray-300 flex items-center gap-2 mb-1.5">
                                        <Link2 className="w-4 h-4" />
                                        Link de Destino (Base URL)
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={baseUrl}
                                                onChange={(e) => setBaseUrl(e.target.value)}
                                                onFocus={() => setShowUrlDropdown(true)}
                                                placeholder="Ex: https://form.typeform.com/to/Exemplo"
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white pr-10"
                                            />
                                            <button onClick={() => setShowUrlDropdown(!showUrlDropdown)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            {showUrlDropdown && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                                                    {isSavingUrl ? (
                                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                                                            <div className="flex gap-2">
                                                                <input autoFocus type="text" className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-700 rounded dark:text-white" placeholder="Ex: Mentoria" value={newUrlAlias} onChange={(e) => setNewUrlAlias(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmSaveUrl()} />
                                                                <button onClick={confirmSaveUrl} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700">Salvar</button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {savedDestinations.map((dest, idx) => (
                                                            <div key={idx} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center group border-b border-slate-50 dark:border-gray-700 last:border-0" onClick={() => { setBaseUrl(dest.url); setShowUrlDropdown(false); }}>
                                                                <div className="overflow-hidden mr-2">
                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-gray-200 truncate">{dest.alias}</div>
                                                                    <div className="text-xs text-slate-500 dark:text-gray-400 truncate">{dest.url}</div>
                                                                </div>
                                                                <button onClick={(e) => deleteUrlFromStorage(dest.url, e)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => { if (!baseUrl) return; setNewUrlAlias(''); setIsSavingUrl(true); setShowUrlDropdown(true); }} disabled={!baseUrl} className="px-3 py-2 bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 hover:text-indigo-600"><Save className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="md:col-span-12">
                                    <div className="flex justify-end border-b border-slate-100 dark:border-gray-700 pb-6">
                                        <button onClick={handleAiGenerate} disabled={isGenerating || !title} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-md transition-all w-full sm:w-auto justify-center ${isGenerating || !title ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}>
                                            {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <><Sparkles className="w-5 h-5" /> Gerar Slug & Link</>}
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg flex items-start gap-2 text-sm border border-amber-200 dark:border-amber-800 mt-4">
                                            <AlertCircle className="w-5 h-5 shrink-0" /> <p>{error}</p>
                                        </div>
                                    )}

                                    <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-5 border border-slate-200 dark:border-gray-700 space-y-5 shadow-inner mt-6">
                                        <InputGroup label="Slug Gerado & UTM Content" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="yt-..." className="bg-white" />

                                        <div className="pt-2">
                                            <label className="text-sm font-bold text-slate-800 dark:text-gray-200 flex items-center gap-2 mb-2"><ExternalLink className="w-4 h-4" /> Link Final</label>
                                            <div className="relative">
                                                <textarea readOnly value={generatedLink} className="w-full h-24 px-4 py-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900 rounded-lg text-slate-600 dark:text-gray-300 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500" placeholder="O link final aparecerá aqui..." />
                                                {generatedLink && (
                                                    <div className="absolute bottom-3 right-3 flex gap-2">
                                                        <button onClick={() => window.open(generatedLink, '_blank')} className="px-3 py-1.5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 text-xs font-medium rounded-md border border-slate-300 dark:border-gray-600">Testar</button>
                                                        <button onClick={() => copyToClipboard(generatedLink, setCopySuccess)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all shadow-sm ${copySuccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'}`}>
                                                            {copySuccess ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar</>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    {!shortLink ? (
                                                        <div className="flex items-center gap-3 w-full">
                                                            <div className="flex-1 text-sm text-slate-600 dark:text-gray-400">Deseja uma versão curta? (escaladae.com/yt-...)</div>
                                                            <button onClick={handleShortenLink} disabled={!generatedLink || isShortening} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all ${!generatedLink || isShortening ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                                                {isShortening ? "Encurtando..." : <><Zap className="w-4 h-4" /> Encurtar Link</>}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 truncate">{shortLink}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <button onClick={() => window.open(shortLink, '_blank')} className="p-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 rounded-md"><ExternalLink className="w-4 h-4" /></button>
                                                                <button onClick={() => copyToClipboard(shortLink, setShortCopySuccess)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border ${shortCopySuccess ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'}`}>
                                                                    {shortCopySuccess ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-2 flex justify-end">
                                    </div>

                                    {/* Video Description Section */}
                                    <div className="mt-8 border-t border-slate-100 dark:border-gray-700 pt-6">
                                        <button onClick={() => setShowDescription(!showDescription)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <MessageSquareText className="w-5 h-5 text-indigo-600" />
                                                <span className="font-bold text-slate-800 dark:text-gray-200">DESCRIÇÃO DO VÍDEO</span>
                                            </div>
                                            {showDescription ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </button>

                                        {showDescription && (
                                            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs text-slate-500 dark:text-gray-400">Edite e salve a descrição que será atualizada na base de dados.</p>
                                                    <button onClick={loadDescriptionFromYoutube} disabled={!videoId || isLoadingFromYoutube} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                                                        {isLoadingFromYoutube ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                        CARREGAR DESCRIÇÃO
                                                    </button>
                                                </div>
                                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A descrição do vídeo aparecerá aqui..." className="w-full h-80 px-4 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-slate-600 dark:text-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                                                <div className="flex justify-end">
                                                    <button onClick={saveDescriptionToDatabase} disabled={!videoId || isSavingDescription} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50">
                                                        {isSavingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        SALVAR DESCRIÇÃO
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-gray-700 z-50 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-5 bg-slate-50 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 dark:text-gray-200 flex items-center gap-2"><History className="w-5 h-5 text-indigo-600" /> Histórico Salvo</h2>
                        <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {sessions.length === 0 ? (
                            <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                                <History className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">Nenhum trabalho salvo ainda.</p>
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div key={session.id} className="bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-md cursor-pointer group relative" onClick={() => loadSession(session)}>
                                    <div className="absolute top-3 right-3">
                                        {session.type === 'draft' ? (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1"><FileEdit className="w-3 h-3" /> RASCUNHO</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">AUTO</span>
                                        )}
                                    </div>
                                    <div className="mb-1 pr-20">
                                        <h3 className="font-semibold text-slate-800 dark:text-gray-200 text-sm line-clamp-2 leading-tight">{session.title || "Sem título"}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 mb-2 mt-2">
                                        <Clock className="w-3 h-3" />
                                        {new Date(session.timestamp).toLocaleDateString('pt-BR')}
                                    </div>
                                    {session.shortLink && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-1 rounded flex items-center gap-1 mb-2 w-fit max-w-full overflow-hidden">
                                            <Zap className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{session.shortLink.replace('https://', '')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end border-t border-slate-50 dark:border-gray-600 pt-2 mt-2">
                                        <button onClick={(e) => deleteSession(session.id, e)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                        <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium flex items-center gap-1 group-hover:underline">Carregar <ArrowRight className="w-3 h-3" /></span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {showHistory && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setShowHistory(false)} />}
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { InputGroup } from './UtmInputGroup';
import {
    Link2, Youtube, Calendar, Settings2, Sparkles, Copy, Check, ExternalLink,
    AlertCircle, Zap, Save, History, Trash2, Clock, ChevronDown, X, ArrowRight,
    FolderHeart, FileEdit, Eraser
} from 'lucide-react';

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
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
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

    const [slug, setSlug] = useState('');
    const [utmParams, setUtmParams] = useState<UTMParams>(DEFAULT_UTM);
    const [generatedLink, setGeneratedLink] = useState('');
    const [shortLink, setShortLink] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [isShortening, setIsShortening] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [shortCopySuccess, setShortCopySuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([]);
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [showUrlDropdown, setShowUrlDropdown] = useState(false);
    const [isSavingUrl, setIsSavingUrl] = useState(false);
    const [newUrlAlias, setNewUrlAlias] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);
    const isLoadingSessionRef = useRef(false);

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
    }, []);

    const loadDrafts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/utm/links`);
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
                    shortLink: item.short_url || ''
                };
            });
            setSessions(mappedSessions);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUrlDropdown(false);
                setIsSavingUrl(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            is_draft: type === 'draft'
        };

        try {
            const res = await fetch(`${API_BASE_URL}/utm/links`, {
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
            await fetch(`${API_BASE_URL}/utm/links/${id}`, { method: 'DELETE' });
            setSessions(prev => prev.filter(s => s.id !== id));
        } catch (e) { console.error("Erro ao deletar", e); }
    };

    const handleAiGenerate = async () => {
        if (!title) { setError("Por favor, insira um título de vídeo."); return; }
        setError(null);
        setIsGenerating(true);
        setShortLink('');

        const formattedDate = getFormattedDateForSlug(date);
        const prefix = `yt-${formattedDate}`;

        try {
            const res = await fetch(`${API_BASE_URL}/utm/slug`, {
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
            const res = await fetch(`${API_BASE_URL}/utm/shorten`, {
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
                is_draft: false
            };

            await fetch(`${API_BASE_URL}/utm/links`, {
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
        setShowHistory(false);
        setError(null);
        setTimeout(() => { isLoadingSessionRef.current = false; }, 200);
    };

    const clearForm = () => {
        setTitle('');
        setDate(getTodayString());
        setBaseUrl('');
        setSlug('');
        setGeneratedLink('');
        setShortLink('');
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

    return (
        <div className="relative h-full flex flex-col font-sans transition-colors duration-200">

            {/* Main Content Area */}
            <div className={`flex-1 transition-all duration-300 ${showHistory ? 'mr-80' : ''}`}>
                <div className="flex justify-center pb-8">
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
                                <button
                                    onClick={clearForm}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                                    title="Limpar Campos"
                                >
                                    <Eraser className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-white text-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
                                    title="Histórico Salvo"
                                >
                                    <History className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                                    title="Configurações"
                                >
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

                        {/* Form Content */}
                        <div className="p-6 space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-8">
                                    <InputGroup label="Título do Vídeo" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: R$1 milhão por mês no TikTok Shop" icon={<Youtube className="w-4 h-4" />} />
                                </div>
                                <div className="md:col-span-4">
                                    <InputGroup label="Data de Publicação" type="date" value={date} onChange={(e) => setDate(e.target.value)} icon={<Calendar className="w-4 h-4" />} />
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
                            </div>

                            <div className="flex justify-end border-b border-slate-100 dark:border-gray-700 pb-6">
                                <button onClick={handleAiGenerate} disabled={isGenerating || !title} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-md transition-all w-full sm:w-auto justify-center ${isGenerating || !title ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}>
                                    {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <><Sparkles className="w-5 h-5" /> Gerar Slug & Link</>}
                                </button>
                            </div>

                            {error && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg flex items-start gap-2 text-sm border border-amber-200 dark:border-amber-800">
                                    <AlertCircle className="w-5 h-5 shrink-0" /> <p>{error}</p>
                                </div>
                            )}

                            <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-5 border border-slate-200 dark:border-gray-700 space-y-5 shadow-inner">
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
                                <button onClick={() => saveSession('draft')} disabled={!title} className="bg-slate-800 hover:bg-slate-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
                                    <FolderHeart className="w-5 h-5 text-amber-400" /> SALVAR RASCUNHO
                                </button>
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

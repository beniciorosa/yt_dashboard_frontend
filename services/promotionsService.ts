
import { supabase } from './supabaseClient';
import { fetchYoutubeChannelData } from './youtubeService';

export interface Promotion {
    id?: number;
    titulo: string;
    status: string;
    meta: string;
    data_criacao: string;
    custo: number;
    impressoes: number;
    visualizacoes: number;
    inscritos: number;
    cpv: number;
    cps: number;
    data_coleta: string;
    thumbnail?: string; // We will fetch this separately
}

export const fetchPromotions = async (): Promise<Promotion[]> => {
    try {
        // We want the latest entry for each 'titulo'.
        // Supabase JS doesn't support DISTINCT ON directly in select easily with the typed client unless we use .rpc or raw query, 
        // but we can fetch all and filter in JS if the dataset is not huge. 
        // Or we can try to order by data_coleta desc and then process.

        // Let's fetch all data ordered by date desc
        const { data, error } = await supabase
            .from('yt_promotions')
            .select('*')
            .order('data_coleta', { ascending: false });

        if (error) {
            console.error('Error fetching promotions:', error);
            throw error;
        }

        if (!data) return [];

        // Filter to keep only the latest for each title
        const latestPromotionsMap = new Map<string, Promotion>();

        data.forEach((item: any) => {
            // Normalize title to ensure we group correctly? Assuming exact match.
            if (!latestPromotionsMap.has(item.titulo)) {
                latestPromotionsMap.set(item.titulo, item);
            }
        });

        const cleanCurrency = (val: any, field?: string): number => {
            if (!val && val !== 0) return 0;
            let num = 0;

            if (typeof val === 'number') {
                num = val;
            } else {
                let str = val.toString().replace(/[R$\s]/g, '');
                // If comma exists, assume PT-BR format (1.000,00) -> remove dots, replace comma
                if (str.includes(',')) {
                    str = str.replace(/\./g, '').replace(',', '.');
                }
                // Else, assume standard float (1000.00) -> keep dots
                num = parseFloat(str) || 0;
            }

            // Heuristic fix for data brought as integers/cents (x100) or missing separator
            if (field === 'cpv' || field === 'cps') {
                if (num > 10) num = num / 100;
            }
            if (field === 'custo') {
                if (num > 100000) num = num / 100;
            }

            return num;
        };

        const cleanInt = (val: any): number => {
            if (typeof val === 'number') return Math.floor(val);
            if (!val) return 0;
            // Remove all non-digits (handles 1.000 formatted strings)
            return parseInt(val.toString().replace(/\D/g, ''), 10) || 0;
        };

        const cleanDate = (dateStr: string): string => {
            if (!dateStr) return '';
            const trimmed = dateStr.toString().trim().toLowerCase();

            // Handle PT-BR textual format: "13 de dez. de 2025"
            const ptBrMatch = trimmed.match(/^(\d{1,2})\s+de\s+([a-zç\.]+)\s+de\s+(\d{4})/);
            if (ptBrMatch) {
                const [_, day, monthStr, year] = ptBrMatch;
                const months: Record<string, string> = {
                    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
                    'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
                    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06',
                    'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
                };
                const cleanMonth = monthStr.replace('.', '');
                const monthNum = months[cleanMonth] || '01';
                return `${year}-${monthNum}-${day.padStart(2, '0')}`;
            }

            const match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) {
                const [_, day, month, year] = match;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            const d = new Date(trimmed);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }

            return dateStr;
        };

        const cleanedPromotions = Array.from(latestPromotionsMap.values()).map(p => ({
            ...p,
            custo: cleanCurrency(p.custo, 'custo'),
            impressoes: cleanInt(p.impressoes),
            visualizacoes: cleanInt(p.visualizacoes),
            inscritos: cleanInt(p.inscritos),
            cpv: cleanCurrency(p.cpv, 'cpv'),
            cps: cleanCurrency(p.cps, 'cps'),
            data_criacao: cleanDate(p.data_criacao),
            // Ensure status logic if necessary, otherwise keep as is
        }));

        return cleanedPromotions;
    } catch (error) {
        console.error('Error in fetchPromotions:', error);
        return [];
    }
};

export const fetchPromotionHistory = async (title: string, days?: number): Promise<Promotion[]> => {
    try {
        let query = supabase
            .from('yt_promotions')
            .select('*')
            .eq('titulo', title)
            .order('data_coleta', { ascending: true });

        if (days) {
            const d = new Date();
            d.setDate(d.getDate() - days);
            query = query.gte('data_coleta', d.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching promotion history:', error);
            return [];
        }

        const cleanCurrency = (val: any, field?: string): number => {
            if (!val && val !== 0) return 0;
            let num = 0;

            if (typeof val === 'number') {
                num = val;
            } else {
                let str = val.toString().replace(/[R$\s]/g, '');
                if (str.includes(',')) {
                    str = str.replace(/\./g, '').replace(',', '.');
                }
                num = parseFloat(str) || 0;
            }

            if (field === 'cpv' || field === 'cps') {
                if (num > 10) num = num / 100;
            }
            if (field === 'custo') {
                if (num > 100000) num = num / 100;
            }

            return num;
        };

        const cleanInt = (val: any): number => {
            if (typeof val === 'number') return Math.floor(val);
            if (!val) return 0;
            return parseInt(val.toString().replace(/\D/g, ''), 10) || 0;
        };

        const cleanDate = (dateStr: string): string => {
            if (!dateStr) return '';
            const trimmed = dateStr.toString().trim();

            // Try to match DD/MM/YYYY
            const match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) {
                const [_, day, month, year] = match;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Fallback: If it's already a valid date string (e.g. ISO), let it be, 
            // but we prefer YYYY-MM-DD for consistency
            const d = new Date(trimmed);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }

            return dateStr;
        };

        return (data || []).map((p: any) => ({
            ...p,
            custo: cleanCurrency(p.custo, 'custo'),
            impressoes: cleanInt(p.impressoes),
            visualizacoes: cleanInt(p.visualizacoes),
            inscritos: cleanInt(p.inscritos),
            cpv: cleanCurrency(p.cpv, 'cpv'),
            cps: cleanCurrency(p.cps, 'cps'),
            data_criacao: cleanDate(p.data_criacao),
        }));
    } catch (error) {
        console.error('Error in fetchPromotionHistory:', error);
        return [];
    }
}

// Helper to fetch thumbnail from YouTube API
const CACHE_KEY_PREFIX = 'yt_thumb_';

export const getVideoThumbnail = async (title: string): Promise<string> => {
    // Check local storage cache first to save API calls
    const cacheKey = CACHE_KEY_PREFIX + title;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
        // Use the existing search functionality or simple search
        // We need to access the youtube API directly or via a backend proxy ideally.
        // Assuming we have an endpoint or we can use the client-side key if available.
        // Checking youtubeService for search capability.

        // Use the Youtube Data API search endpoint
        // This requires an API KEY. I'll rely on the one in youtubeService if exported, or env.

        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        if (!apiKey) {
            console.warn("No YouTube API Key found.");
            return '';
        }

        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(title)}&type=video&key=${apiKey}&maxResults=1`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const thumb = data.items[0].snippet.thumbnails.medium.url;
            localStorage.setItem(cacheKey, thumb);
            return thumb;
        }
    } catch (e) {
        console.error("Error fetching thumbnail for", title, e);
    }
    return '';
}

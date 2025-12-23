
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
    thumbnail?: string;
    thumbnail_url?: string; // Add this to match DB column
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

        if (!data || data.length === 0) return [];

        // Filter to keep only the latest entry for each unique title
        const latestPromotionsMap = new Map<string, any>();

        const normalizeTitle = (title: string): string => {
            if (!title) return '';
            // Aggressive normalization: lowercase, trim
            let normalized = title.trim().toLowerCase();

            // 1. Remove trailing dates in PT-BR (e.g., "27 de nov. de 2025")
            normalized = normalized.replace(/\s+\d{1,2}\s+de\s+[a-zç\.]+\s+de\s+\d{4}.*$/, '');

            // 2. Remove trailing status words if they appear as metadata in title
            normalized = normalized.replace(/\s+(encerrou|pausada|ativa|active|ended|paused).*$/, '');

            // 3. Remove non-alphanumeric at the end and collapse spaces
            return normalized
                .replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\(\)]+$/, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        data.forEach((item: any) => {
            const normalized = normalizeTitle(item.titulo);
            if (!latestPromotionsMap.has(normalized)) {
                latestPromotionsMap.set(normalized, {
                    ...item,
                    titulo: normalized // Keep normalized version for better grouping
                });
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
            thumbnail: p.thumbnail_url || '', // Use the column from yt_promotions directly
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

// Simple similarity function (Dice Coefficient) for client-side ranking
const getSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '');
    const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '');

    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const bigrams = new Map<string, number>();
    for (let i = 0; i < s1.length - 1; i++) {
        const bigram = s1.substring(i, i + 2);
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }

    let intersection = 0;
    for (let i = 0; i < s2.length - 1; i++) {
        const bigram = s2.substring(i, i + 2);
        if (bigrams.has(bigram) && bigrams.get(bigram)! > 0) {
            bigrams.set(bigram, bigrams.get(bigram)! - 1);
            intersection++;
        }
    }

    return (2.0 * intersection) / (s1.length + s2.length - 2);
};

export const getVideoThumbnail = async (title: string): Promise<string> => {
    if (!title) return '';
    const cacheKey = CACHE_KEY_PREFIX + title;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
        // 1. First attempt: Substring match (most likely scenario based on user feedback)
        // We fetch up to 5 candidates to select the best one
        const { data: candidates, error } = await supabase
            .from('yt_myvideos')
            .select('title, thumbnail_url')
            .ilike('title', `%${title}%`)
            .limit(5);

        if (error && error.code !== 'PGRST116') {
            console.error("Error fetching thumb candidates (ilike):", error);
        }

        let bestMatch = '';
        let highestScore = 0;

        // Helper to evaluate candidates
        const evaluate = (items: any[]) => {
            for (const item of items) {
                const score = getSimilarity(title, item.title);
                // Bonus for valid thumbnail
                if (item.thumbnail_url && score > highestScore) {
                    highestScore = score;
                    bestMatch = item.thumbnail_url;
                }
            }
        };

        if (candidates && candidates.length > 0) {
            evaluate(candidates);
        }

        // 2. Second attempt: Text Search (for cases where words are shuffled or extra chars exist)
        // parsing the title to a websearch query pattern could be useful, or just plain text
        if (highestScore < 0.4) { // Threshold: if no good match found yet
            const { data: searchCandidates, error: searchError } = await supabase
                .from('yt_myvideos')
                .select('title, thumbnail_url')
                .textSearch('title', title, { config: 'english', type: 'websearch' }) // 'english' or 'simple' works decent for general queries
                .limit(5);

            if (!searchError && searchCandidates) {
                evaluate(searchCandidates);
            }
        }

        if (bestMatch) {
            localStorage.setItem(cacheKey, bestMatch);
            return bestMatch;
        }

    } catch (e) {
        console.error("Error in getVideoThumbnail", e);
    }
    return '';
}

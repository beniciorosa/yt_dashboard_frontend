
import { supabase } from './supabaseClient';

export interface Promotion {
    id?: number;
    titulo: string;          // título de EXIBIÇÃO (real do vídeo quando mapeado)
    adTitle?: string;        // título original do anúncio (pode diferir do vídeo)
    videoId?: string;        // video_id real, extraído da thumbnail
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
    thumbnail_url?: string;
}

// ===== Helpers =====

// O video_id está embutido na thumbnail do Studio: i.ytimg.com/vi/<id>/... ou /vi_webp/<id>/...
// Isso torna o mapeamento promoção→vídeo 100% confiável, MESMO quando o Ads muda o título do anúncio.
export const extractVideoId = (url?: string | null): string | null => {
    if (!url) return null;
    const m = url.match(/\/vi(?:_webp)?\/([\w-]{11})(?:[/?]|$)/);
    return m ? m[1] : null;
};

const normalizeTitle = (title: string): string => {
    if (!title) return '';
    let normalized = title.trim().toLowerCase();
    normalized = normalized.replace(/\s+\d{1,2}\s+de\s+[a-zç\.]+\s+de\s+\d{4}.*$/, '');
    normalized = normalized.replace(/\s+(encerrou|pausada|ativa|active|ended|paused).*$/, '');
    normalized = normalized.split(/reprovada\s+"reprovada"|declarações\s+não\s+confiáveis/i)[0];
    return normalized
        .replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\(\)]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
};

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
    const trimmed = dateStr.toString().trim().toLowerCase();
    const ptBrMatch = trimmed.match(/(\d{1,2})\s+de\s+([a-zç\.]+)\s+de\s+(\d{4})/);
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
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return dateStr;
};

const cleanPromotionRow = (p: any, meta?: { title: string; thumbnail_url: string }): Promotion => {
    const adTitle = (p.titulo || '').toString();
    return {
        ...p,
        videoId: p._videoId || undefined,
        adTitle,
        titulo: meta?.title || adTitle, // título real do vídeo quando mapeado
        thumbnail: meta?.thumbnail_url || p.thumbnail_url || '',
        custo: cleanCurrency(p.custo, 'custo'),
        impressoes: cleanInt(p.impressoes),
        visualizacoes: cleanInt(p.visualizacoes),
        inscritos: cleanInt(p.inscritos),
        cpv: cleanCurrency(p.cpv, 'cpv'),
        cps: cleanCurrency(p.cps, 'cps'),
        data_criacao: cleanDate(p.data_criacao),
    };
};

export const fetchPromotions = async (): Promise<Promotion[]> => {
    try {
        // 1. Última coleta = snapshot atual das promoções (igual ao que está no Studio agora)
        const { data: maxRow, error: maxErr } = await supabase
            .from('yt_promotions')
            .select('data_coleta')
            .order('data_coleta', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (maxErr) { console.error('Error fetching promotions:', maxErr); throw maxErr; }
        const maxColeta = (maxRow as any)?.data_coleta;
        if (!maxColeta) return [];

        // 2. TODAS as campanhas desse batch (cada linha = 1 campanha, sem agrupar por vídeo —
        //    assim o total bate com o gasto real e nenhuma campanha fica escondida)
        const { data, error } = await supabase
            .from('yt_promotions')
            .select('*')
            .eq('data_coleta', maxColeta);
        if (error) {
            console.error('Error fetching promotions:', error);
            throw error;
        }
        if (!data || data.length === 0) return [];

        const rows = data.map((item: any) => ({ ...item, _videoId: extractVideoId(item.thumbnail_url) }));

        // 3. Títulos/thumbs reais dos vídeos mapeados
        const ids = Array.from(new Set(rows.map(r => r._videoId).filter(Boolean))) as string[];
        const videoMeta = new Map<string, { title: string; thumbnail_url: string }>();
        if (ids.length > 0) {
            const { data: vids } = await supabase
                .from('yt_myvideos')
                .select('video_id, title, thumbnail_url')
                .in('video_id', ids);
            (vids || []).forEach((v: any) => videoMeta.set(v.video_id, { title: v.title, thumbnail_url: v.thumbnail_url }));
        }

        // 4. Limpa cada campanha com o título real do vídeo (mapeado pela thumbnail)
        return rows.map((p: any) => cleanPromotionRow(p, p._videoId ? videoMeta.get(p._videoId) : undefined));
    } catch (error) {
        console.error('Error in fetchPromotions:', error);
        return [];
    }
};

// Histórico de uma promoção. Usa o video_id (confiável) quando disponível; senão cai no título.
export const fetchPromotionHistory = async (promotion: Pick<Promotion, 'videoId' | 'adTitle' | 'titulo'>, days?: number): Promise<Promotion[]> => {
    try {
        let query = supabase
            .from('yt_promotions')
            .select('*')
            .order('data_coleta', { ascending: true });

        if (days) {
            const d = new Date();
            d.setDate(d.getDate() - days);
            query = query.gte('data_coleta', d.toISOString());
        }

        // Filtra NO BANCO (evita o teto de 1000 linhas do PostgREST, que cortava o histórico
        // numa tabela com ~1.5k linhas): por video_id embutido na thumbnail quando mapeado;
        // senão, por título aproximado.
        if (promotion.videoId) {
            query = query.ilike('thumbnail_url', `%${promotion.videoId}%`);
        } else if (promotion.adTitle || promotion.titulo) {
            const t = (promotion.adTitle || promotion.titulo || '').slice(0, 20);
            if (t) query = query.ilike('titulo', `%${t}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching promotion history:', error);
            return [];
        }

        let rows = data || [];
        if (promotion.videoId) {
            // Filtra por video_id extraído da thumbnail — pega todo o histórico do MESMO vídeo
            // mesmo que o título do anúncio tenha mudado entre as coletas.
            rows = rows.filter((r: any) => extractVideoId(r.thumbnail_url) === promotion.videoId);
        } else {
            const t = normalizeTitle(promotion.adTitle || promotion.titulo || '');
            rows = rows.filter((r: any) => normalizeTitle(r.titulo) === t);
        }

        return rows.map((p: any) => cleanPromotionRow({ ...p, _videoId: extractVideoId(p.thumbnail_url) }));
    } catch (error) {
        console.error('Error in fetchPromotionHistory:', error);
        return [];
    }
};

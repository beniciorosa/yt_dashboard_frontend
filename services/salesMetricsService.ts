
// @ts-ignore
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://yt-dashboard-backend.vercel.app');

export interface SalesRankingItem {
    videoId: string;
    videoTitle: string;
    thumbnailUrl: string;
    totalRevenue: number;
    dealsCount: number;
    wonCount: number;
    wonToday: number;
    lostCount: number;
    conversionRate: number;
    products: string[];
}

export interface SalesSummary {
    totalRevenue: number;
    totalDeals: number;
    totalWon: number;
    conversionRate: number;
}

export interface TopVideoItem {
    videoId: string;
    videoTitle: string;
    thumbnailUrl: string;
    totalRevenue: number;
    wonCount: number;
    dealsCount: number;
}

export interface TopVendedorItem {
    name: string;
    revenue: number;
    wonCount: number;
    dealsCount: number;
}

// Monta os parâmetros de período, incluindo datas no modo personalizado
const buildPeriodQuery = (period: string, start?: string, end?: string): string => {
    if (period === 'custom' && start && end) {
        return `period=custom&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    }
    return `period=${encodeURIComponent(period)}`;
};

// ===== Análises (comparação de períodos) =====
export interface AnalysisParams {
    periodA: string; startA?: string; endA?: string;
    periodB: string; startB?: string; endB?: string;
    sellerScope: 'youtube' | 'all';
}

export interface AnalysisKpi { revenue: number; leads: number; won: number; conversionRate: number; avgTicket: number; }
export interface VideoMover {
    videoId: string; videoTitle: string; thumbnailUrl: string;
    a: AnalysisKpi; b: AnalysisKpi;
    deltaRevenue: number; deltaLeads: number; deltaLeadsPct: number;
    status: string; lastLeadDate: string | null; lastWonDate: string | null;
}
export interface SellerMover {
    name: string; a: AnalysisKpi; b: AnalysisKpi;
    deltaRevenue: number; deltaLeads: number; deltaConversion: number; status: string;
}
export interface AnalysisResult {
    ranges: { a: { start: string | null; end: string | null }; b: { start: string | null; end: string | null } };
    sellerScope: string;
    kpis: { a: AnalysisKpi; b: AnalysisKpi; delta: { revenue: number; leads: number; won: number; conversionRate: number; avgTicket: number } };
    videoMovers: VideoMover[];
    sellerMovers: SellerMover[];
    timeline: { a: { date: string; leads: number; revenue: number }[]; b: { date: string; leads: number; revenue: number }[] };
    insights: { type: string; severity: 'positive' | 'negative' | 'neutral'; text: string }[];
}

export const fetchSalesAnalysis = async (p: AnalysisParams): Promise<AnalysisResult | null> => {
    try {
        const qs = new URLSearchParams();
        qs.set('periodA', p.periodA); qs.set('periodB', p.periodB); qs.set('sellerScope', p.sellerScope);
        if (p.startA) qs.set('startA', p.startA); if (p.endA) qs.set('endA', p.endA);
        if (p.startB) qs.set('startB', p.startB); if (p.endB) qs.set('endB', p.endB);
        const res = await fetch(`${API_BASE_URL}/api/sales/analysis?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch analysis');
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const fetchAiSummary = async (analysis: AnalysisResult): Promise<string> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/analysis/ai-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysis),
        });
        if (!res.ok) throw new Error('Failed to fetch AI summary');
        const data = await res.json();
        return data.summary || '';
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// ===== ROI dos anúncios (Promoções × Vendas) =====
export interface PromotionRoiItem {
    videoId: string; videoTitle: string; thumbnailUrl: string;
    campaigns: number; adSpend: number; promoViews: number; subsGained: number; impressions: number;
    leads: number; won: number; revenue: number; roi: number; net: number; costPerLead: number; costPerSale: number;
}
export interface PromotionRoiResult {
    rows: PromotionRoiItem[];
    summary: { totalAdSpend: number; totalRevenue: number; roi: number; net: number; promotedVideos: number; lastColeta?: string };
}

export const fetchPromotionRoi = async (): Promise<PromotionRoiResult | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/roi`);
        if (!res.ok) throw new Error('Failed to fetch ROI');
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
};

// Sempre todo o período (ignora a data selecionada na tela)
export const fetchTopVideos = async (limit = 5): Promise<TopVideoItem[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/top-videos?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch top videos');
        return await res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const fetchTopVendedores = async (limit = 5): Promise<TopVendedorItem[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/top-vendedores?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch top vendedores');
        return await res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const fetchSalesSummary = async (): Promise<SalesSummary> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/summary`);
        if (!res.ok) throw new Error('Failed to fetch summary');
        return await res.json();
    } catch (error) {
        console.error(error);
        return { totalRevenue: 0, totalDeals: 0, totalWon: 0, conversionRate: 0 };
    }
};

export const fetchSalesRanking = async (): Promise<SalesRankingItem[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/ranking`);
        if (!res.ok) throw new Error('Failed to fetch ranking');
        return await res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const fetchSalesDashboardData = async (period: string = 'month', start?: string, end?: string): Promise<{ summary: SalesSummary, ranking: SalesRankingItem[] }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/dashboard?${buildPeriodQuery(period, start, end)}`);
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        return await res.json();
    } catch (error) {
        console.error(error);
        return {
            summary: { totalRevenue: 0, totalDeals: 0, totalWon: 0, conversionRate: 0 },
            ranking: []
        };
    }
};

export const fetchDealsByVideo = async (videoId: string, period: string = 'month', start?: string, end?: string): Promise<{ video: any, deals: any[] }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sales/${videoId}?${buildPeriodQuery(period, start, end)}`);
        if (!res.ok) throw new Error('Failed to fetch deals');
        return await res.json();
    } catch (error) {
        console.error(error);
        return { video: null, deals: [] };
    }
};

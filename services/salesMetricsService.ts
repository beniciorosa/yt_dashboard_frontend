
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

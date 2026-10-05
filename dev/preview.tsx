// Harness de desenvolvimento: renderiza as telas novas com dados FICTÍCIOS, sem login e sem
// backend, para revisar layout. Não entra no build de produção (só /dev/preview.html no `npm run dev`).
import React, { useCallback, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionContext, SessionValue } from '../app/session';
import { AppShell } from '../app/AppShell';
import { PeriodProvider } from '../lib/period';
import { ToastProvider } from '../components/ui';
import { ClosersPage } from '../pages/ClosersPage';
import { AttributionPage } from '../pages/AttributionPage';
import { VideoTypesPage } from '../pages/VideoTypesPage';
import { SalesPage } from '../pages/SalesPage';
import { MobileSalesPage } from '../pages/mobile/MobileSalesPage';
import { BACKEND_URL } from '../services/apiClient';
import '../styles/app.css';

const thumb = (seed: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="hsl(${seed * 47 % 360} 35% 32%)"/></svg>`)}`;
const video = (i: number, title: string) => ({ video_id: `vid${String(i).padStart(8, '0')}`, title, thumbnail_url: thumb(i), published_at: `2026-0${(i % 8) + 1}-1${i % 9}T12:00:00Z` });

const closer = (ownerName: string, leads: number, won: number, lost: number, revenue: number, cycle: number | null, inferredRole = 'closer') => ({
    ownerName, ownerId: null, role: null, inferredRole, leads, won, lost, revenue,
    winRate: won + lost ? won / (won + lost) : null, avgTicket: won ? revenue / won : null, avgCycleDays: cycle,
    meetingsScheduled: null, meetingsHeld: null, showRate: null, meetingToWin: null,
});
const CLOSERS = [
    closer('Ana Prado', 228, 44, 175, 474292, 15.5), closer('Bruno Lima', 190, 24, 147, 258790, 17.7),
    closer('Carla Nunes', 160, 25, 137, 253200, 16.9), closer('Diego Faria', 181, 23, 143, 237990, 15.5),
    closer('Elisa Rocha', 196, 16, 165, 176034, 27.9), closer('Fábio Maia', 71, 12, 66, 116868, 31.2),
    closer('Gabi Souza', 640, 0, 610, 0, null, 'sdr'), closer('Hugo Reis', 590, 0, 571, 0, null, 'sdr'),
];
const stats = (factor: number) => {
    const rows = CLOSERS.map((r) => ({ ...r, leads: Math.round(r.leads * factor), won: Math.round(r.won * factor), lost: Math.round(r.lost * factor), revenue: Math.round(r.revenue * factor) }));
    const sum = (k: 'leads' | 'won' | 'lost' | 'revenue') => rows.reduce((a, r) => a + r[k], 0);
    const won = sum('won'), lost = sum('lost'), revenue = sum('revenue');
    return { totals: { leads: sum('leads'), won, lost, revenue, winRate: won / (won + lost), avgTicket: revenue / won }, rows };
};

const TYPES = ['Importação', 'Anúncios', 'Precificação', 'Novidades da plataforma', 'Primeiros passos'];
const matrix = () => {
    const rates = [[.31, .18, .22, .12, .25], [.14, .27, .16, .1, .12], [.2, .15, .3, .09, .17], [.17, .16, .12, .21, .11], [.08, .1, .09, .07, .13], [.22, .05, .2, .5, .1]];
    const cells = CLOSERS.slice(0, 6).flatMap((c, i) => TYPES.map((typeName, j) => {
        const closed = i === 5 ? 4 + j : 14 + ((i * 7 + j * 5) % 30);
        const won = Math.round(closed * rates[i][j]);
        return { ownerName: c.ownerName, typeId: j + 1, typeName, closed, won, revenue: won * 10200, winRate: won / closed };
    }));
    const types = TYPES.map((typeName, j) => {
        const own = cells.filter((c) => c.typeId === j + 1);
        const closed = own.reduce((a, c) => a + c.closed, 0), won = own.reduce((a, c) => a + c.won, 0);
        return { typeId: j + 1, typeName, closed, won, revenue: won * 10200, winRate: won / closed };
    });
    return { dimension: 'tema', types, cells };
};

const DIMS = ['tema', 'formato', 'publico', 'produto'] as const;
const DIM_TYPES: Record<string, string[]> = {
    tema: TYPES, formato: ['Tutorial', 'Estudo de caso', 'Notícia', 'Opinião'], publico: ['Iniciante', 'Em crescimento', 'Avançado'], produto: ['Mentoria Starter', 'Mentoria PRO', 'Nenhum específico'],
};
const typeId = (d: string, i: number) => DIMS.indexOf(d as any) * 10 + i + 1;
const TITLES = ['Como importar da China gastando pouco', 'O erro que derruba seus anúncios', 'Precificação sem prejuízo: planilha', 'Mudou tudo: novas tarifas', 'Seu primeiro produto em 7 dias', 'De R$ 22 mil a R$ 600 mil em 1 ano', 'Product Ads na prática', 'Catálogo: vale a pena?'];

const FIXTURES: Record<string, (url: URL) => unknown> = {
    '/api/sync-status': () => [
        { job: 'my-videos', last: { status: 'error', started_at: new Date().toISOString(), finished_at: null, error: 'Falha ao renovar token do canal (invalid_grant)' }, lastSuccess: '2026-07-09T11:00:00Z' },
        { job: 'competitors', last: { status: 'success', started_at: new Date().toISOString(), finished_at: new Date().toISOString(), error: null }, lastSuccess: new Date(Date.now() - 3 * 3600e3).toISOString() },
    ],
    '/api/hubspot/status': () => ({ configured: false }),
    '/api/attribution/coverage': () => ({
        methods: [{ method: 'link', deals: 3230, won: 195, revenue: 1967816 }, { method: 'slug', deals: 201, won: 24, revenue: 184700 }, { method: 'unattributed', deals: 1125, won: 81, revenue: 800440 }],
        totalDeals: 4556, attributedDeals: 3431, totalRevenue: 2952957, attributedRevenue: 2152516, dealCoverage: 0.753, revenueCoverage: 0.729,
    }),
    '/api/attribution/orphans': () => [
        { utm: 'yt-video0808', deals: 736, won: 48, revenue: 492202, firstDeal: '2025-08-08', lastDeal: '2026-09-30', candidates: [] },
        { utm: 'yt-150525-novidade-dinheiro-bolso', deals: 178, won: 11, revenue: 115500, firstDeal: '2025-05-15', lastDeal: '2025-12-18', candidates: [video(1, TITLES[3]), video(2, TITLES[5])] },
        { utm: 'yt-191225-product', deals: 64, won: 6, revenue: 61404, firstDeal: '2025-12-19', lastDeal: '2026-08-24', candidates: [video(3, TITLES[6])] },
    ],
    '/api/attribution/aliases': () => [],
    '/api/attribution/videos': () => TITLES.map((t, i) => video(i + 10, t)),
    '/api/closers': (url) => ({ scope: url.searchParams.get('scope'), ...stats(url.searchParams.get('scope') === 'all' ? 3.1 : (url.searchParams.get('end') || '') < new Date().toISOString().slice(0, 10) ? 0.86 : 1) }),
    '/api/closers/matrix': matrix,
    '/api/closers/products': () => [{ product: 'Mentoria Meli Starter', won: 31, revenue: 248000 }, { product: 'Mentoria Meli PRO', won: 6, revenue: 72000 }, { product: 'Metrify X', won: 4, revenue: 9800 }, { product: 'Treinamento Escalada Ecom', won: 2, revenue: 3000 }],
    '/api/closers/recent-wins': () => Array.from({ length: 8 }, (_, i) => ({ dealId: i, customer: ['Marcos Vinícius', 'Patrícia S.', 'Lucas Z.', 'Renata O.', 'Felipe A.', 'Juliana M.', 'Carlos E.', 'Ana B.'][i], ownerName: CLOSERS[i % 6].ownerName, amount: [10000, 8700, 8000, 12000, 6500, 8000, 10500, 5000][i], closedOn: `2026-10-0${5 - (i % 5)}`, products: ['Mentoria Meli Starter'], source: i % 3 === 0 ? 'youtube' : 'outro' })),
    '/api/sales/dashboard': (url) => {
        const f = (url.searchParams.get('start') || '') < '2026-09-07' ? 0.7 : 1;
        const ranking = TITLES.map((t, i) => ({ videoId: `v${i}`, videoTitle: t, thumbnailUrl: thumb(i + 20), totalRevenue: Math.round((90000 - i * 11000) * f), dealsCount: 40 - i * 4, wonCount: Math.round((9 - i) * f), wonToday: i === 1 ? 2 : 0, lostCount: 20 - i * 2, conversionRate: ((9 - i) / (40 - i * 4)) * 100, products: ['Mentoria Meli Starter', 'Mentoria Meli PRO', 'Metrify X', 'Treinamento'].slice(0, (i % 4) + 1) }));
        const totalRevenue = ranking.reduce((a, r) => a + r.totalRevenue, 0), totalWon = ranking.reduce((a, r) => a + r.wonCount, 0), totalDeals = ranking.reduce((a, r) => a + r.dealsCount, 0);
        return { summary: { totalRevenue, totalDeals, totalWon, conversionRate: (totalWon / totalDeals) * 100 }, ranking };
    },
    '/api/sales/top-videos': () => TITLES.slice(0, 5).map((t, i) => ({ videoId: `v${i}`, videoTitle: t, thumbnailUrl: thumb(i + 20), totalRevenue: 560000 - i * 90000, wonCount: 52 - i * 8, dealsCount: 400 - i * 50 })),
    '/api/sales/top-vendedores': () => CLOSERS.slice(0, 5).map((c) => ({ name: c.ownerName, revenue: c.revenue, wonCount: c.won, dealsCount: c.leads })),
    '/api/video-types': () => ({
        totalVideos: 1143,
        dimensions: DIMS.map((d, di) => ({
            dimension: d, guide: 'descrição da dimensão', classified: 1143 - di * 190,
            types: DIM_TYPES[d].map((name, i) => ({ id: typeId(d, i), dimension: d, name, description: 'Quando usar este tipo', videos: 60 + ((i * 53 + di * 31) % 240) })),
        })),
    }),
    '/api/video-types/videos': () => Array.from({ length: 140 }, (_, i) => ({
        videoId: `vid${i}`, title: `${TITLES[i % TITLES.length]} #${i + 1}`, thumbnailUrl: thumb(i), publishedAt: `2026-0${(i % 9) + 1}-1${i % 9}T12:00:00Z`,
        types: Object.fromEntries(DIMS.filter((_, di) => (i + di) % 7 !== 0).map((d, di) => [d, { typeId: typeId(d, (i + di) % DIM_TYPES[d].length), source: i % 5 === 0 && di === 0 ? 'manual' : 'ia' }])),
    })),
};

// Responde às chamadas do backend com as fixtures; o resto da rede passa direto.
const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!raw.startsWith(BACKEND_URL)) return realFetch(input, init);
    const url = new URL(raw);
    const fixture = FIXTURES[url.pathname];
    await new Promise((r) => setTimeout(r, 250));
    if (!fixture || (init?.method && init.method !== 'GET')) {
        return new Response(JSON.stringify({ message: 'Preview com dados fictícios: ação indisponível.' }), { status: 501, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(fixture(url)), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 60_000 } } });

const Preview: React.FC = () => {
    const [theme, setThemeState] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') === 'light' ? 'light' : 'dark'));
    const setTheme = useCallback((t: 'light' | 'dark') => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        localStorage.setItem('theme', t);
        setThemeState(t);
    }, []);
    const session = useMemo<SessionValue>(() => ({
        session: { user: { id: 'preview', email: 'preview@exemplo.com' } } as any,
        loading: false, role: 'admin', youtubeConnected: true, connectingYoutube: false,
        connectYoutube: () => undefined, signOut: async () => undefined, theme, setTheme,
    }), [theme, setTheme]);
    const start = new URLSearchParams(window.location.search).get('path') || '/receita/closers';

    return (
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[start]}>
                <SessionContext.Provider value={session}>
                    <PeriodProvider>
                        <ToastProvider>
                            <Routes>
                                <Route path="/m/vendas" element={<MobileSalesPage />} />
                                <Route element={<AppShell />}>
                                    <Route path="/receita/closers" element={<ClosersPage />} />
                                    <Route path="/receita/atribuicao" element={<AttributionPage />} />
                                    <Route path="/canal/tipos" element={<VideoTypesPage />} />
                                    <Route path="/receita/vendas" element={<SalesPage />} />
                                    <Route path="*" element={<Navigate to="/receita/closers" replace />} />
                                </Route>
                            </Routes>
                        </ToastProvider>
                    </PeriodProvider>
                </SessionContext.Provider>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Preview />);

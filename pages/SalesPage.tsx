import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, Video } from 'lucide-react';
import {
    fetchSalesDashboardData, fetchTopVendedores, fetchTopVideos, SalesRankingItem, TopVendedorItem, TopVideoItem,
} from '../services/salesMetricsService';
import { SalesDetailsModal } from '../components/SalesMetrics/SalesDetailsModal';
import { SalesAnalysis } from '../components/SalesMetrics/SalesAnalysis';
import { Badge, Column, DataTable, EmptyState, ErrorState, KpiCard, Section, Skeleton, Tabs } from '../components/ui';
import { Period, previousPeriod, usePeriod } from '../lib/period';
import { delta, fmtBRL, fmtInt, fmtPct } from '../lib/format';

/** Parâmetros do backend de vendas para o período global do cabeçalho. */
const periodParams = (p: Period) => (p.start && p.end ? { period: 'custom', start: p.start, end: p.end } : { period: 'all' });

const useSalesDashboard = (p: Period | null) => useQuery({
    queryKey: ['sales', 'dashboard', p?.start ?? 'all', p?.end ?? 'all'],
    queryFn: () => {
        const q = periodParams(p!);
        return fetchSalesDashboardData(q.period, q.start, q.end);
    },
    enabled: !!p,
});

const Thumb: React.FC<{ url?: string | null }> = ({ url }) => (
    url
        ? <img src={url} alt="" loading="lazy" className="h-9 w-16 rounded object-cover shrink-0" />
        : <div className="h-9 w-16 rounded bg-surface-2 shrink-0" />
);

const RevenueBar: React.FC<{ value: number; max: number }> = ({ value, max }) => (
    <div className="flex items-center justify-end gap-2">
        <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden hidden xl:block">
            <div className="h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: 'var(--chart-1)' }} />
        </div>
        <span>{fmtBRL(value)}</span>
    </div>
);

const TopList: React.FC<{ title: string; description: string; icon: React.ReactNode; loading: boolean; error: unknown; items: { key: string; thumb?: string | null; label: string; sub: string; value: number }[] }> =
    ({ title, description, icon, loading, error, items }) => {
        const max = Math.max(0, ...items.map((i) => i.value));
        return (
            <Section title={title} description={description} flush>
                {error ? <ErrorState error={error} /> : loading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
                    <ol className="divide-y divide-line">
                        {items.map((item, i) => (
                            <li key={item.key} className="flex items-center gap-3 px-4 h-14">
                                <span className="w-5 text-xs text-fg-subtle tabular text-right">{i + 1}</span>
                                {item.thumb !== undefined ? <Thumb url={item.thumb} /> : <span className="h-9 w-9 rounded-full bg-surface-2 inline-flex items-center justify-center text-fg-subtle">{icon}</span>}
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm text-fg truncate">{item.label}</div>
                                    <div className="text-xs text-fg-subtle truncate">{item.sub}</div>
                                </div>
                                <div className="w-24 shrink-0 text-right">
                                    <div className="text-sm font-medium text-fg tabular">{fmtBRL(item.value)}</div>
                                    <div className="h-1 mt-1 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${max ? (item.value / max) * 100 : 0}%`, background: 'var(--chart-1)' }} /></div>
                                </div>
                            </li>
                        ))}
                        {items.length === 0 && <EmptyState title="Nenhuma venda ainda" />}
                    </ol>
                )}
            </Section>
        );
    };

const Overview: React.FC = () => {
    const { period } = usePeriod();
    const current = useSalesDashboard(period);
    const previous = useSalesDashboard(previousPeriod(period));
    const topVideos = useQuery({ queryKey: ['sales', 'top-videos'], queryFn: () => fetchTopVideos(5) });
    const topSellers = useQuery({ queryKey: ['sales', 'top-sellers'], queryFn: () => fetchTopVendedores(5) });
    const [selected, setSelected] = useState<SalesRankingItem | null>(null);

    const ranking = useMemo(() => (current.data?.ranking || []).filter((r) => r.dealsCount > 0 || r.wonCount > 0), [current.data]);
    const maxRevenue = Math.max(0, ...ranking.map((r) => r.totalRevenue));
    const wonToday = ranking.reduce((acc, r) => acc + (r.wonToday || 0), 0);

    const s = current.data?.summary;
    const p = previous.data?.summary;
    const vs = (cur?: number, prev?: number) => (previous.data ? delta(cur, prev) : undefined);

    const columns = useMemo<Column<SalesRankingItem>[]>(() => [
        {
            id: 'video', header: 'Vídeo', sortValue: (r) => r.videoTitle,
            cell: (r) => (
                <div className="flex items-center gap-3 min-w-0">
                    <Thumb url={r.thumbnailUrl} />
                    <span className="truncate max-w-md text-fg">{r.videoTitle}</span>
                    {r.wonToday > 0 && <Badge tone="positive" title="Vendas fechadas hoje">+{r.wonToday} hoje</Badge>}
                </div>
            ),
        },
        { id: 'deals', header: 'Leads', align: 'right', cell: (r) => fmtInt(r.dealsCount), sortValue: (r) => r.dealsCount, hint: 'Negócios criados ou fechados no período' },
        { id: 'won', header: 'Vendas', align: 'right', cell: (r) => fmtInt(r.wonCount), sortValue: (r) => r.wonCount, hint: 'Negócios ganhos com fechamento no período' },
        { id: 'lost', header: 'Perdidos', align: 'right', cell: (r) => fmtInt(r.lostCount), sortValue: (r) => r.lostCount },
        { id: 'conv', header: 'Conversão', align: 'right', cell: (r) => fmtPct(r.conversionRate / 100), sortValue: (r) => r.conversionRate, hint: 'Vendas ÷ leads' },
        {
            id: 'products', header: 'Produtos', cell: (r) => (
                <div className="flex flex-nowrap gap-1 max-w-xs overflow-hidden">
                    {r.products.slice(0, 3).map((pr) => <Badge key={pr}>{pr}</Badge>)}
                    {r.products.length > 3 && <Badge title={r.products.slice(3).join(', ')}>+{r.products.length - 3}</Badge>}
                </div>
            ),
        },
        { id: 'revenue', header: 'Receita', align: 'right', cell: (r) => <RevenueBar value={r.totalRevenue} max={maxRevenue} />, sortValue: (r) => r.totalRevenue },
    ], [maxRevenue]);

    if (current.error) return <ErrorState error={current.error} onRetry={() => current.refetch()} />;

    const modalPeriod = periodParams(period);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Receita" value={fmtBRL(s?.totalRevenue)} delta={vs(s?.totalRevenue, p?.totalRevenue)} hint="Negócios ganhos atribuídos a vídeos" loading={current.isLoading} />
                <KpiCard label="Vendas" value={fmtInt(s?.totalWon)} delta={vs(s?.totalWon, p?.totalWon)} hint={wonToday > 0 ? `${fmtInt(wonToday)} fechadas hoje` : 'Fechadas no período'} loading={current.isLoading} />
                <KpiCard label="Leads" value={fmtInt(s?.totalDeals)} delta={vs(s?.totalDeals, p?.totalDeals)} hint="Vindos de links de vídeo" loading={current.isLoading} />
                <KpiCard label="Conversão" value={fmtPct(s ? s.conversionRate / 100 : null)} delta={vs(s?.conversionRate, p?.conversionRate)} hint="Vendas ÷ leads" loading={current.isLoading} />
            </div>

            <Section
                title="Vídeos"
                description="Negócios do HubSpot ligados a cada vídeo pela UTM. Clique para ver os negócios, produtos e vendedores do vídeo."
                actions={<Link to="/receita/atribuicao" className="text-xs text-accent hover:underline">UTMs sem vídeo →</Link>}
                flush
            >
                <DataTable
                    columns={columns}
                    rows={ranking}
                    rowKey={(r: SalesRankingItem) => r.videoId}
                    loading={current.isLoading}
                    initialSort={{ id: 'revenue', dir: 'desc' }}
                    onRowClick={setSelected}
                    empty={<EmptyState icon={<Video size={24} />} title="Nenhum negócio no período" description="Nenhum lead ou venda atribuído a vídeo nesse intervalo." />}
                />
            </Section>

            <div className="grid lg:grid-cols-2 gap-4">
                <TopList
                    title="Top 5 vídeos"
                    description="Receita de todo o histórico"
                    icon={<Video size={16} />}
                    loading={topVideos.isLoading}
                    error={topVideos.error}
                    items={(topVideos.data || []).map((v: TopVideoItem) => ({ key: v.videoId, thumb: v.thumbnailUrl, label: v.videoTitle, sub: `${fmtInt(v.wonCount)} vendas · ${fmtInt(v.dealsCount)} leads`, value: v.totalRevenue }))}
                />
                <TopList
                    title="Top 5 vendedores"
                    description="Receita de negócios vindos do YouTube, todo o histórico"
                    icon={<Trophy size={16} />}
                    loading={topSellers.isLoading}
                    error={topSellers.error}
                    items={(topSellers.data || []).map((v: TopVendedorItem) => ({ key: v.name, label: v.name, sub: `${fmtInt(v.wonCount)} vendas · ${fmtInt(v.dealsCount)} leads`, value: v.revenue }))}
                />
            </div>

            {selected && (
                <SalesDetailsModal
                    videoId={selected.videoId}
                    videoTitle={selected.videoTitle}
                    period={modalPeriod.period}
                    customStart={modalPeriod.start}
                    customEnd={modalPeriod.end}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
};

export const SalesPage: React.FC = () => {
    const [tab, setTab] = useState<'overview' | 'analysis'>('overview');
    return (
        <div className="space-y-5">
            <Tabs items={[{ id: 'overview', label: 'Visão geral' }, { id: 'analysis', label: 'Análises' }]} value={tab} onChange={setTab} />
            {tab === 'overview' ? <Overview /> : <SalesAnalysis />}
        </div>
    );
};

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { Period, PeriodPreset, previousPeriod, resolvePeriod } from '../../lib/period';
import { CloserRow, CloserStats } from '../../features/revenue/api';
import { useSession } from '../../app/session';
import { delta, fmtBRL, fmtInt, fmtPct, fmtRelative } from '../../lib/format';
import { cn } from '../../lib/cn';
import { MetrifySection } from './MetrifySection';
import './mobile.css';

// ---------- marca (manual de identidade: preto/branco, Montserrat, símbolo de progresso) ----------

const Symbol: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
        <rect x="96" y="96" width="320" height="320" rx="72" fill="currentColor" />
        <path d="M232 164 L380 164 L380 312 Z" fill="#000" />
    </svg>
);

const Wordmark: React.FC = () => (
    <span className="m-wordmark" aria-label="Escalada">ESC<span className="m-lambda">Λ</span>L<span className="m-lambda">Λ</span>D<span className="m-lambda">Λ</span></span>
);

// ---------- dados ----------

type Preset = Extract<PeriodPreset, 'month' | '7d' | '28d'> | 'today';
const PRESETS: { id: Preset; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: 'month', label: 'Mês' },
    { id: '28d', label: '28 dias' },
    { id: '7d', label: '7 dias' },
];

const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const periodFor = (preset: Preset): Period => (preset === 'today' ? { preset: 'custom', start: todayIso(), end: todayIso() } : resolvePeriod(preset));

const useStats = (p: Period | null) => useQuery({
    queryKey: ['closers', 'stats', p?.start ?? null, p?.end ?? null, 'all'],
    queryFn: () => api<CloserStats>(`/closers?start=${p!.start}&end=${p!.end}&scope=all`),
    enabled: !!p,
    refetchInterval: 5 * 60_000,
});

interface RecentWin {
    dealId: number;
    customer: string | null;
    ownerName: string;
    amount: number;
    closedOn: string;
    products: string[];
    source: 'youtube' | 'outro' | null;
}

const firstName = (name: string) => name.split(' ')[0];
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

const Stat: React.FC<{ label: string; value: string; delta?: number | null; big?: boolean }> = ({ label, value, delta: d, big }) => (
    <div className={cn('m-stat', big && 'm-stat--big')}>
        <div className="m-stat__label">{label}</div>
        <div className="m-stat__value">{value}</div>
        {d !== undefined && (
            <div className={cn('m-stat__delta', d === null ? 'is-muted' : d >= 0 ? 'is-up' : 'is-down')}>
                {d === null ? '—' : `${d >= 0 ? '▲' : '▼'} ${Math.abs(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`}
            </div>
        )}
    </div>
);

export const MobileSalesPage: React.FC = () => {
    const { session, signOut } = useSession();
    const qc = useQueryClient();
    const [preset, setPreset] = useState<Preset>('month');
    const [refreshing, setRefreshing] = useState(false);
    const [showAllWins, setShowAllWins] = useState(false);
    const period = useMemo(() => periodFor(preset), [preset]);
    const stats = useStats(period);
    const previous = useStats(previousPeriod(period));
    const products = useQuery({
        queryKey: ['closers', 'products', period.start, period.end],
        queryFn: () => api<{ product: string; won: number; revenue: number }[]>(`/closers/products?start=${period.start}&end=${period.end}`),
        refetchInterval: 5 * 60_000,
    });
    const recent = useQuery({ queryKey: ['closers', 'recent-wins'], queryFn: () => api<RecentWin[]>('/closers/recent-wins?limit=25'), refetchInterval: 5 * 60_000 });

    useEffect(() => {
        document.title = 'Escalada · Vendas';
        document.documentElement.classList.add('dark');
    }, []);

    const refresh = async () => {
        setRefreshing(true);
        await qc.invalidateQueries({ queryKey: ['closers'] });
        setTimeout(() => setRefreshing(false), 600);
    };

    const t = stats.data?.totals;
    const p = previous.data?.totals;
    const vs = (cur?: number | null, prev?: number | null) => (previous.data ? delta(cur, prev) : undefined);
    const prevLabel = preset === 'month' ? 'vs mês passado' : preset === 'today' ? 'vs ontem' : 'vs período anterior';

    const closers = useMemo(() => {
        const rows = (stats.data?.rows || []).filter((r: CloserRow) => (r.role || r.inferredRole) === 'closer' || r.won > 0);
        return rows.sort((a, b) => b.revenue - a.revenue || b.won - a.won);
    }, [stats.data]);
    const maxRevenue = Math.max(0, ...closers.map((c) => c.revenue));

    const error = stats.error || recent.error;

    return (
        <div className="m-app">
            <div className="m-bg" aria-hidden />

            <header className="m-header">
                <div className="m-brand">
                    <Symbol />
                    <Wordmark />
                </div>
                <button onClick={refresh} aria-label="Atualizar" className={cn('m-iconbtn', refreshing && 'is-spinning')}>
                    <RefreshCw size={18} />
                </button>
            </header>

            <nav className="m-segmented" role="tablist">
                {PRESETS.map((item) => (
                    <button key={item.id} role="tab" aria-selected={preset === item.id} onClick={() => setPreset(item.id)} className={cn('m-segmented__btn', preset === item.id && 'is-active')}>
                        {item.label}
                    </button>
                ))}
            </nav>

            <main className="m-main">
                {error ? (
                    <section className="m-card m-card--error">
                        <div className="m-card__title">Não foi possível carregar</div>
                        <p>{error instanceof Error ? error.message : String(error)}</p>
                        <button className="m-btn" onClick={refresh}>Tentar de novo</button>
                    </section>
                ) : (
                    <>
                        <section className="m-hero">
                            <div className="m-hero__label">Receita · {PRESETS.find((x) => x.id === preset)?.label.toLowerCase()}</div>
                            <div className={cn('m-hero__value', stats.isLoading && 'is-loading')}>{stats.isLoading ? '—' : fmtBRL(t?.revenue)}</div>
                            <div className="m-hero__sub">
                                {stats.isLoading ? '' : (() => {
                                    const d = vs(t?.revenue, p?.revenue);
                                    if (d === undefined || d === null) return `${fmtInt(t?.won)} vendas`;
                                    return <><span className={d >= 0 ? 'is-up' : 'is-down'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%</span> {prevLabel} · {fmtBRL(p?.revenue)}</>;
                                })()}
                            </div>
                        </section>

                        <section className="m-grid">
                            <Stat label="Vendas" value={fmtInt(t?.won)} delta={vs(t?.won, p?.won)} />
                            <Stat label="Ticket médio" value={fmtBRL(t?.avgTicket)} delta={vs(t?.avgTicket, p?.avgTicket)} />
                            <Stat label="Leads" value={fmtInt(t?.leads)} delta={vs(t?.leads, p?.leads)} />
                            <Stat label="Fechamento" value={fmtPct(t?.winRate, 0)} delta={vs(t?.winRate, p?.winRate)} />
                        </section>

                        <section className="m-card">
                            <div className="m-card__head">
                                <div className="m-card__title">Vendedores</div>
                                <div className="m-card__hint">{fmtInt(closers.length)} com vendas</div>
                            </div>
                            <ol className="m-list">
                                {closers.map((c, i) => (
                                    <li key={c.ownerName} className="m-closer">
                                        <div className="m-closer__rank">{i + 1}</div>
                                        <div className="m-avatar">{initials(c.ownerName)}</div>
                                        <div className="m-closer__body">
                                            <div className="m-closer__row">
                                                <span className="m-closer__name">{c.ownerName}</span>
                                                <span className="m-closer__revenue">{fmtBRL(c.revenue)}</span>
                                            </div>
                                            <div className="m-bar"><div className="m-bar__fill" style={{ width: `${maxRevenue ? (c.revenue / maxRevenue) * 100 : 0}%` }} /></div>
                                            <div className="m-closer__meta">
                                                {fmtInt(c.won)} {c.won === 1 ? 'venda' : 'vendas'} · {fmtInt(c.leads)} leads · fecha {fmtPct(c.winRate, 0)}
                                                {c.avgTicket ? ` · ticket ${fmtBRL(c.avgTicket)}` : ''}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                                {!stats.isLoading && closers.length === 0 && <li className="m-empty">Nenhuma venda no período.</li>}
                                {stats.isLoading && [0, 1, 2].map((i) => <li key={i} className="m-skeleton" />)}
                            </ol>
                        </section>

                        <section className="m-card">
                            <div className="m-card__head">
                                <div className="m-card__title">Produtos</div>
                                <div className="m-card__hint">vendas no período</div>
                            </div>
                            <ul className="m-list">
                                {(products.data || []).map((pr) => {
                                    const max = Math.max(0, ...(products.data || []).map((x) => x.revenue));
                                    return (
                                        <li key={pr.product} className="m-product">
                                            <div className="m-closer__row">
                                                <span className="m-product__name">{pr.product}</span>
                                                <span className="m-win__amount">{fmtBRL(pr.revenue)}</span>
                                            </div>
                                            <div className="m-bar"><div className="m-bar__fill" style={{ width: `${max ? (pr.revenue / max) * 100 : 0}%` }} /></div>
                                            <div className="m-closer__meta">{fmtInt(pr.won)} {pr.won === 1 ? 'venda' : 'vendas'}{pr.won ? ` · ticket ${fmtBRL(pr.revenue / pr.won)}` : ''}</div>
                                        </li>
                                    );
                                })}
                                {!products.isLoading && (products.data || []).length === 0 && <li className="m-empty">Nenhuma venda no período.</li>}
                                {products.isLoading && [0, 1].map((i) => <li key={i} className="m-skeleton" />)}
                            </ul>
                        </section>

                        <MetrifySection period={period} periodLabel={PRESETS.find((x) => x.id === preset)?.label.toLowerCase() || ''} />

                        <section className="m-card">
                            <div className="m-card__head">
                                <div className="m-card__title">Últimas vendas</div>
                                <div className="m-card__hint">todas as origens</div>
                            </div>
                            <ul className="m-list">
                                {(recent.data || []).slice(0, showAllWins ? undefined : 5).map((w) => (
                                    <li key={w.dealId} className="m-win">
                                        <div className="m-avatar m-avatar--sm">{initials(w.ownerName)}</div>
                                        <div className="m-win__body">
                                            <div className="m-closer__row">
                                                <span className="m-win__customer">{w.customer || 'Negócio'}</span>
                                                <span className="m-win__amount">{fmtBRL(w.amount)}</span>
                                            </div>
                                            <div className="m-closer__meta">
                                                {firstName(w.ownerName)} · {new Date(`${w.closedOn}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                                                {w.products[0] ? ` · ${w.products[0]}` : ''}
                                                {w.source === 'youtube' ? ' · YouTube' : ''}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="m-win__chev" />
                                    </li>
                                ))}
                                {recent.isLoading && [0, 1, 2, 3].map((i) => <li key={i} className="m-skeleton" />)}
                            </ul>
                            {(recent.data?.length || 0) > 5 && (
                                <button className="m-more" onClick={() => setShowAllWins((v) => !v)}>
                                    {showAllWins ? 'Mostrar menos' : `Ver mais ${fmtInt((recent.data?.length || 0) - 5)}`}
                                </button>
                            )}
                        </section>
                    </>
                )}

                <footer className="m-footer">
                    <span>{stats.dataUpdatedAt ? `Atualizado ${fmtRelative(new Date(stats.dataUpdatedAt).toISOString())}` : ''}</span>
                    <button onClick={signOut} className="m-link">Sair{session?.user.email ? ` · ${session.user.email.split('@')[0]}` : ''}</button>
                </footer>
            </main>
        </div>
    );
};

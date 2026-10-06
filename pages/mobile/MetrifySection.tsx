import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Period } from '../../lib/period';
import { fmtBRL, fmtInt } from '../../lib/format';
import { cn } from '../../lib/cn';

interface HotmartMetrics {
    count: number;
    gross: number;
    fees: number;
    net: number;
    refunds: number;
    refundedGross: number;
    daily: { date: string; count: number; gross: number; net: number }[];
    products: { product: string; count: number; gross: number; net: number }[];
}

const PRODUCT_FILTER = 'metrify';

/** Preenche os dias sem venda com zero, para o gráfico mostrar o período inteiro. */
const fillDays = (start: string, end: string, daily: HotmartMetrics['daily']) => {
    const byDay = new Map(daily.map((d) => [d.date, d]));
    const out: { date: string; gross: number; net: number; count: number }[] = [];
    for (let d = new Date(`${start}T00:00:00`); ; d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const row = byDay.get(iso);
        out.push({ date: iso, gross: row?.gross ?? 0, net: row?.net ?? 0, count: row?.count ?? 0 });
        if (iso >= end || out.length > 370) break;
    }
    return out;
};

const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const DailyChart: React.FC<{ days: { date: string; gross: number; count: number }[] }> = ({ days }) => {
    const [active, setActive] = useState<number | null>(null);
    const max = Math.max(0, ...days.map((d) => d.gross));
    const W = 320;
    const H = 110;
    const gap = days.length > 40 ? 1 : 2;
    const bw = Math.max(2, (W - gap * (days.length - 1)) / days.length);
    const sel = active !== null ? days[active] : null;
    const last = days[days.length - 1];

    return (
        <div className="m-chart">
            <div className="m-chart__head">
                <span className="m-chart__title">Valor pago por dia</span>
                <span className="m-chart__legend">
                    {sel ? `${dayLabel(sel.date)} · ${fmtBRL(sel.gross)} · ${fmtInt(sel.count)} ${sel.count === 1 ? 'venda' : 'vendas'}` : `melhor dia ${fmtBRL(max)}`}
                </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="m-chart__svg" role="img" aria-label="Vendas do Metrify por dia" onMouseLeave={() => setActive(null)}>
                <line x1="0" y1={H - 18.5} x2={W} y2={H - 18.5} stroke="currentColor" strokeOpacity="0.15" />
                {days.map((d, i) => {
                    const h = max ? Math.max(d.gross > 0 ? 2 : 0, ((H - 22) * d.gross) / max) : 0;
                    const x = i * (bw + gap);
                    return (
                        <g key={d.date} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
                            {/* alvo de toque maior que a barra */}
                            <rect x={x} y={0} width={bw + gap} height={H - 18} fill="transparent" />
                            <rect
                                x={x} y={H - 19 - h} width={bw} height={h} rx={bw > 6 ? 2 : 1}
                                fill="currentColor" fillOpacity={active === null || active === i ? 1 : 0.35}
                            />
                        </g>
                    );
                })}
                {days.length > 1 && (
                    <>
                        <text x="0" y={H - 4} fontSize="9" fill="currentColor" fillOpacity="0.55">{dayLabel(days[0].date)}</text>
                        <text x={W} y={H - 4} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="end">{dayLabel(last.date)}</text>
                    </>
                )}
            </svg>
        </div>
    );
};

export const MetrifySection: React.FC<{ period: Period; periodLabel: string }> = ({ period, periodLabel }) => {
    const q = useQuery({
        queryKey: ['hotmart', 'metrics', period.start, period.end, PRODUCT_FILTER],
        queryFn: () => api<HotmartMetrics>(`/hotmart/metrics?start=${period.start}&end=${period.end}&product=${PRODUCT_FILTER}`),
        refetchInterval: 5 * 60_000,
        retry: false,
    });
    const status = useQuery({ queryKey: ['hotmart', 'status'], queryFn: () => api<{ configured: boolean }>('/hotmart/status'), retry: false });

    const days = useMemo(() => (q.data && period.start && period.end ? fillDays(period.start, period.end, q.data.daily) : []), [q.data, period.start, period.end]);

    if (status.data && !status.data.configured) {
        return (
            <section className="m-card">
                <div className="m-card__head"><div className="m-card__title">Metrify · Hotmart</div></div>
                <p className="m-empty">Hotmart ainda não conectada. No painel: Admin → Integrações.</p>
            </section>
        );
    }

    const m = q.data;
    return (
        <section className="m-card m-card--hotmart">
            <div className="m-card__head">
                <div className="m-card__title">Metrify · Hotmart</div>
                <div className="m-card__hint">{periodLabel} · não entra no HubSpot</div>
            </div>

            {q.error ? (
                <p className="m-empty">{q.error instanceof Error ? q.error.message : 'Falha ao carregar'}</p>
            ) : (
                <>
                    <div className="m-grid m-grid--inset">
                        <div className="m-stat">
                            <div className="m-stat__label">Vendas</div>
                            <div className={cn('m-stat__value', q.isLoading && 'is-loading')}>{q.isLoading ? '—' : fmtInt(m?.count)}</div>
                            {m && m.refunds > 0 && <div className="m-stat__delta is-muted">{fmtInt(m.refunds)} reembolso{m.refunds === 1 ? '' : 's'} · {fmtBRL(m.refundedGross)}</div>}
                        </div>
                        <div className="m-stat">
                            <div className="m-stat__label">Valor pago</div>
                            <div className={cn('m-stat__value', q.isLoading && 'is-loading')}>{q.isLoading ? '—' : fmtBRL(m?.gross)}</div>
                            <div className="m-stat__delta is-muted">taxas Hotmart {fmtBRL(m?.fees)}</div>
                        </div>
                        <div className="m-stat m-stat--wide">
                            <div className="m-stat__label">Líquido após as taxas</div>
                            <div className={cn('m-stat__value', q.isLoading && 'is-loading')}>{q.isLoading ? '—' : fmtBRL(m?.net)}</div>
                            <div className="m-stat__delta is-muted">
                                {m && m.gross > 0 ? `${((m.net / m.gross) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do valor pago` : ''}
                            </div>
                        </div>
                    </div>

                    {days.length > 0 && <DailyChart days={days} />}

                    <ul className="m-list">
                        {(m?.products || []).map((p) => (
                            <li key={p.product} className="m-product">
                                <div className="m-closer__row">
                                    <span className="m-product__name">{p.product}</span>
                                    <span className="m-win__amount">{fmtBRL(p.gross)}</span>
                                </div>
                                <div className="m-closer__meta">{fmtInt(p.count)} {p.count === 1 ? 'venda' : 'vendas'} · líquido {fmtBRL(p.net)}</div>
                            </li>
                        ))}
                        {m && m.products.length === 0 && <li className="m-empty">Nenhuma venda do Metrify no período.</li>}
                    </ul>
                </>
            )}
        </section>
    );
};

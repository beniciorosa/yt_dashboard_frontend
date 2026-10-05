import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, RefreshCw, Shapes } from 'lucide-react';
import {
    CloserMatrix, CloserRow, CloserScope, Dimension, DIMENSIONS, DIMENSION_LABELS, OwnerRole,
    runHubspotSync, saveHubspotToken, useCloserMatrix, useCloserStats, useHubspotStatus, useSetOwnerRole,
} from '../features/revenue/api';
import { Badge, Button, Column, DataTable, EmptyState, ErrorState, KpiCard, Section, Segmented, Skeleton, Tabs, useToast } from '../components/ui';
import { previousPeriod, usePeriod } from '../lib/period';
import { delta, fmtBRL, fmtInt, fmtPct } from '../lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../app/session';
import { cn } from '../lib/cn';

const ROLE_LABELS: Record<OwnerRole, string> = { closer: 'Closer', sdr: 'SDR', outro: 'Outro' };
/** Abaixo disso a taxa de um cruzamento closer × tipo é ruído, não sinal. */
const MIN_SAMPLE = 8;

const RoleCell: React.FC<{ row: CloserRow }> = ({ row }) => {
    const toast = useToast();
    const setRole = useSetOwnerRole();
    const role = row.role || row.inferredRole;

    // Sem ID do HubSpot (sync direto ainda não rodou) o papel é só inferido.
    if (row.ownerId === null) {
        return <Badge tone={role === 'closer' ? 'accent' : 'neutral'} title="Papel inferido pelas vendas no período">{ROLE_LABELS[role]}</Badge>;
    }
    return (
        <select
            value={row.role || ''}
            aria-label={`Papel de ${row.ownerName}`}
            onChange={(e) => setRole.mutate(
                { ownerId: row.ownerId!, role: (e.target.value || null) as OwnerRole | null },
                { onError: (err) => toast(err.message, 'error') },
            )}
            className="h-6 px-1.5 rounded bg-surface-2 border border-line text-[11px] text-fg-muted"
        >
            <option value="">{ROLE_LABELS[row.inferredRole]} (auto)</option>
            <option value="closer">Closer</option>
            <option value="sdr">SDR</option>
            <option value="outro">Outro</option>
        </select>
    );
};

const RevenueCell: React.FC<{ value: number; max: number }> = ({ value, max }) => (
    <div className="flex items-center justify-end gap-2">
        <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden hidden xl:block">
            <div className="h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: 'var(--chart-1)' }} />
        </div>
        <span>{fmtBRL(value)}</span>
    </div>
);

const Ranking: React.FC<{ rows: CloserRow[]; loading: boolean }> = ({ rows, loading }) => {
    const [group, setGroup] = useState<'closer' | 'outros'>('closer');
    const isCloser = (r: CloserRow) => (r.role || r.inferredRole) === 'closer';
    const visible = rows.filter((r) => (group === 'closer' ? isCloser(r) : !isCloser(r)));
    const maxRevenue = Math.max(0, ...visible.map((r) => r.revenue));
    const hasMeetings = rows.some((r) => r.meetingsScheduled !== null);

    const columns = useMemo<Column<CloserRow>[]>(() => [
        {
            id: 'name', header: 'Nome', sortValue: (r) => r.ownerName,
            cell: (r) => <div className="flex items-center gap-2 min-w-0"><span className="truncate font-medium">{r.ownerName}</span><RoleCell row={r} /></div>,
        },
        { id: 'leads', header: 'Leads', align: 'right', cell: (r) => fmtInt(r.leads), sortValue: (r) => r.leads, hint: 'Negócios criados no período' },
        ...(hasMeetings ? [
            { id: 'held', header: 'Reuniões', align: 'right', cell: (r) => (r.meetingsHeld === null ? '—' : `${fmtInt(r.meetingsHeld)} / ${fmtInt(r.meetingsScheduled)}`), sortValue: (r) => r.meetingsHeld, hint: 'Realizadas / agendadas no período' },
            { id: 'show', header: 'Comparec.', align: 'right', cell: (r) => fmtPct(r.showRate, 0), sortValue: (r) => r.showRate, hint: 'Reuniões realizadas ÷ agendadas' },
        ] as Column<CloserRow>[] : []),
        { id: 'won', header: 'Vendas', align: 'right', cell: (r) => fmtInt(r.won), sortValue: (r) => r.won, hint: 'Negócios ganhos com fechamento no período' },
        { id: 'winRate', header: 'Fechamento', align: 'right', cell: (r) => fmtPct(r.winRate), sortValue: (r) => r.winRate, hint: 'Ganhos ÷ (ganhos + perdidos) fechados no período' },
        { id: 'ticket', header: 'Ticket médio', align: 'right', cell: (r) => fmtBRL(r.avgTicket), sortValue: (r) => r.avgTicket },
        { id: 'cycle', header: 'Ciclo', align: 'right', cell: (r) => (r.avgCycleDays === null ? '—' : `${r.avgCycleDays.toLocaleString('pt-BR')} d`), sortValue: (r) => r.avgCycleDays, hint: 'Dias entre criar e ganhar o negócio (média)' },
        { id: 'revenue', header: 'Receita', align: 'right', cell: (r) => <RevenueCell value={r.revenue} max={maxRevenue} />, sortValue: (r) => r.revenue },
    ], [hasMeetings, maxRevenue]);

    return (
        <Section
            title="Ranking"
            description="Leads contam pela data de criação; vendas e perdas, pela data de fechamento."
            actions={<Segmented items={[{ id: 'closer', label: 'Closers' }, { id: 'outros', label: 'SDRs e outros' }]} value={group} onChange={setGroup} />}
            flush
        >
            <DataTable
                columns={columns}
                rows={visible}
                rowKey={(r: CloserRow) => r.ownerName}
                loading={loading}
                initialSort={{ id: group === 'closer' ? 'revenue' : 'leads', dir: 'desc' }}
                empty={<EmptyState title="Ninguém neste grupo no período" />}
            />
        </Section>
    );
};

/** Cor do desvio em relação à média do tipo; a intensidade satura em ±15 pontos percentuais. */
const divergeStyle = (diff: number): React.CSSProperties => {
    const strength = Math.min(1, Math.abs(diff) / 0.15);
    const pole = diff >= 0 ? 'var(--diverge-pos)' : 'var(--diverge-neg)';
    return { background: `color-mix(in oklab, ${pole} ${Math.round(strength * 55)}%, var(--surface-2))` };
};

const Matrix: React.FC<{ matrix: CloserMatrix; closers: Set<string> }> = ({ matrix, closers }) => {
    const owners = useMemo(() => {
        const totals = new Map<string, number>();
        matrix.cells.forEach((c) => totals.set(c.ownerName, (totals.get(c.ownerName) || 0) + c.closed));
        return [...totals.entries()].filter(([name]) => closers.has(name)).sort((a, b) => b[1] - a[1]).map(([name]) => name);
    }, [matrix, closers]);
    const cell = (owner: string, typeId: number) => matrix.cells.find((c) => c.ownerName === owner && c.typeId === typeId);

    const suggestions = matrix.types
        .map((t) => {
            const best = matrix.cells
                .filter((c) => c.typeId === t.typeId && closers.has(c.ownerName) && c.closed >= MIN_SAMPLE && c.winRate !== null)
                .sort((a, b) => b.winRate! - a.winRate!)[0];
            return best && t.winRate !== null && best.winRate! > t.winRate ? { type: t, best } : null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

    if (owners.length === 0 || matrix.types.length === 0) {
        return <EmptyState title="Sem negócios fechados para cruzar" description="Não há vendas ou perdas no período em vídeos já classificados nesta dimensão." />;
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-0.5">
                    <thead>
                        <tr>
                            <th className="text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle px-2 pb-1">Closer</th>
                            {matrix.types.map((t) => (
                                <th key={t.typeId} className="text-center text-xs font-medium text-fg-muted px-2 pb-1 min-w-[96px]" title={`${fmtInt(t.closed)} negócios fechados`}>
                                    <div className="truncate max-w-[140px] mx-auto">{t.typeName}</div>
                                    <div className="text-[11px] font-normal text-fg-subtle tabular">média {fmtPct(t.winRate, 0)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {owners.map((owner) => (
                            <tr key={owner}>
                                <td className="px-2 py-1 font-medium text-fg whitespace-nowrap">{owner}</td>
                                {matrix.types.map((t) => {
                                    const c = cell(owner, t.typeId);
                                    if (!c || c.winRate === null) return <td key={t.typeId} className="text-center text-fg-subtle rounded bg-surface-2/40">—</td>;
                                    const small = c.closed < MIN_SAMPLE;
                                    const diff = t.winRate === null ? 0 : c.winRate - t.winRate;
                                    return (
                                        <td
                                            key={t.typeId}
                                            title={`${owner} · ${t.typeName}\n${fmtInt(c.won)} vendas em ${fmtInt(c.closed)} fechados · ${fmtBRL(c.revenue)}${small ? '\nAmostra pequena: não comparar' : ''}`}
                                            className={cn('text-center rounded px-2 py-1.5 tabular', small && 'opacity-55')}
                                            style={small ? { background: 'var(--surface-2)' } : divergeStyle(diff)}
                                        >
                                            <div className="font-semibold text-fg">{fmtPct(c.winRate, 0)}</div>
                                            <div className="text-[11px] text-fg-muted">{fmtInt(c.won)}/{fmtInt(c.closed)}</div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--diverge-pos)' }} />Fecha acima da média do tipo</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--diverge-neg)' }} />Abaixo da média</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-surface-2 border border-line" />Menos de {MIN_SAMPLE} negócios fechados (sem comparação)</span>
            </div>

            {suggestions.length > 0 && (
                <div className="border-t border-line pt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle mb-2">Quem fecha melhor cada tipo</h4>
                    <ul className="space-y-1.5">
                        {suggestions.map(({ type, best }) => (
                            <li key={type.typeId} className="text-sm text-fg-muted">
                                <span className="text-fg font-medium">{type.typeName}</span>: {best.ownerName} fecha{' '}
                                <span className="text-fg tabular">{fmtPct(best.winRate, 0)}</span> ({fmtInt(best.won)}/{fmtInt(best.closed)}), contra{' '}
                                <span className="tabular">{fmtPct(type.winRate, 0)}</span> de média.
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const HubspotBanner: React.FC = () => {
    const toast = useToast();
    const qc = useQueryClient();
    const { role } = useSession();
    const status = useHubspotStatus();
    const [syncing, setSyncing] = useState(false);
    const [token, setToken] = useState('');
    const [saving, setSaving] = useState(false);

    const sync = async () => {
        setSyncing(true);
        try {
            // cada chamada cabe no tempo da função; repete até alcançar o presente
            let total = 0;
            for (let round = 0; round < 60; round++) {
                const summary = await runHubspotSync();
                total += summary.deals;
                if (summary.caughtUp) break;
            }
            toast(`HubSpot sincronizado: ${fmtInt(total)} negócios atualizados.`, 'success');
            await Promise.all(['closers', 'sales', 'attribution', 'sync-status'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setSyncing(false);
        }
    };

    const connect = async () => {
        setSaving(true);
        try {
            await saveHubspotToken(token);
            setToken('');
            toast('HubSpot conectado. Iniciando a primeira sincronização…', 'success');
            await qc.invalidateQueries({ queryKey: ['hubspot', 'status'] });
            await sync();
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (status.isLoading || status.error) return null;
    if (!status.data?.configured) {
        return (
            <div className="w-full flex flex-col gap-3 p-4 rounded-card border border-line bg-surface text-sm text-fg-muted">
                <div className="flex items-start gap-2.5">
                    <Info size={16} className="text-accent mt-0.5 shrink-0" />
                    <p>
                        Conecte o HubSpot para ler os negócios direto da fonte (sem depender da automação) e ter reuniões
                        agendadas/realizadas e taxa de comparecimento. No HubSpot: <span className="text-fg">Configurações → Integrações → Private Apps → Criar</span>,
                        com os escopos <code className="font-mono text-xs text-fg">crm.objects.deals.read</code>, <code className="font-mono text-xs text-fg">crm.objects.owners.read</code> e{' '}
                        <code className="font-mono text-xs text-fg">crm.objects.contacts.read</code> e <code className="font-mono text-xs text-fg">e-commerce</code> (itens de linha = produtos). Cole o token abaixo; ele fica guardado só no servidor.
                    </p>
                </div>
                {role === 'admin' ? (
                    <div className="flex gap-2 pl-6">
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="pat-na1-…"
                            autoComplete="off"
                            className="flex-1 max-w-md h-9 px-3 rounded-md bg-surface-2 border border-line text-sm text-fg font-mono placeholder:text-fg-subtle"
                        />
                        <Button variant="primary" onClick={connect} disabled={!token.trim()} loading={saving || syncing}>Conectar e sincronizar</Button>
                    </div>
                ) : (
                    <p className="pl-6 text-xs text-fg-subtle">Peça a um administrador para colar o token.</p>
                )}
            </div>
        );
    }
    return (
        <div className="flex justify-end">
            <Button size="sm" icon={<RefreshCw size={13} />} loading={syncing} onClick={sync}>Sincronizar HubSpot</Button>
        </div>
    );
};

export const ClosersPage: React.FC = () => {
    const { period } = usePeriod();
    const [scope, setScope] = useState<CloserScope>('youtube');
    const [tab, setTab] = useState<'ranking' | 'matrix'>('ranking');
    const [dimension, setDimension] = useState<Dimension>('tema');

    const stats = useCloserStats(period, scope);
    const previous = useCloserStats(previousPeriod(period), scope);
    const matrix = useCloserMatrix(period, dimension, tab === 'matrix');

    const closers = useMemo(
        () => new Set((stats.data?.rows || []).filter((r) => (r.role || r.inferredRole) === 'closer').map((r) => r.ownerName)),
        [stats.data],
    );

    if (stats.error) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;

    const t = stats.data?.totals;
    const p = previous.data?.totals;
    const vs = (cur?: number | null, prev?: number | null) => (previous.data ? delta(cur, prev) : undefined);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented
                    items={[{ id: 'youtube', label: 'Negócios do YouTube' }, { id: 'all', label: 'Todos os negócios' }]}
                    value={scope}
                    onChange={setScope}
                />
                <HubspotBanner />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Receita" value={fmtBRL(t?.revenue)} delta={vs(t?.revenue, p?.revenue)} loading={stats.isLoading} />
                <KpiCard label="Vendas" value={fmtInt(t?.won)} delta={vs(t?.won, p?.won)} hint={`${fmtInt(t?.leads)} leads no período`} loading={stats.isLoading} />
                <KpiCard label="Taxa de fechamento" value={fmtPct(t?.winRate)} delta={vs(t?.winRate, p?.winRate)} hint="Ganhos ÷ fechados" loading={stats.isLoading} />
                <KpiCard label="Ticket médio" value={fmtBRL(t?.avgTicket)} delta={vs(t?.avgTicket, p?.avgTicket)} loading={stats.isLoading} />
            </div>

            <Tabs
                items={[{ id: 'ranking', label: 'Ranking' }, { id: 'matrix', label: 'Por tipo de vídeo' }]}
                value={tab}
                onChange={setTab}
            />

            {tab === 'ranking' && <Ranking rows={stats.data?.rows || []} loading={stats.isLoading} />}

            {tab === 'matrix' && (
                <Section
                    title="Closer × tipo de vídeo"
                    description="Taxa de fechamento dos negócios vindos de vídeos de cada tipo, comparada à média do tipo. Só negócios do YouTube."
                    actions={<Segmented items={DIMENSIONS.map((d) => ({ id: d, label: DIMENSION_LABELS[d] }))} value={dimension} onChange={setDimension} />}
                >
                    {matrix.isLoading && <Skeleton className="h-48 w-full" />}
                    {matrix.error && <ErrorState error={matrix.error} onRetry={() => matrix.refetch()} />}
                    {matrix.data && (matrix.data.types.length === 0
                        ? (
                            <EmptyState
                                icon={<Shapes size={24} />}
                                title="Nenhum vídeo classificado nesta dimensão"
                                description="Classifique os vídeos por tipo para ver quem fecha melhor cada um."
                                action={<Link to="/canal/tipos"><Button variant="primary" size="sm">Classificar vídeos</Button></Link>}
                            />
                        )
                        : <Matrix matrix={matrix.data} closers={closers} />)}
                </Section>
            )}
        </div>
    );
};

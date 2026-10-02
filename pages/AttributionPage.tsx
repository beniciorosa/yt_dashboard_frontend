import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, Search, Trash2 } from 'lucide-react';
import {
    Alias, AttributionMethod, Coverage, Orphan, VideoRef,
    searchVideos, useAliases, useCoverage, useDeleteAlias, useOrphans, useSaveAlias,
} from '../features/revenue/api';
import { Badge, Button, Column, DataTable, EmptyState, ErrorState, KpiCard, Modal, Section, useToast } from '../components/ui';
import { fmtBRL, fmtDate, fmtInt, fmtPct } from '../lib/format';
import { cn } from '../lib/cn';

const METHOD_META: Record<AttributionMethod, { label: string; hint: string; color: string }> = {
    link: { label: 'Link cadastrado', hint: 'UTM igual à de um link salvo em Links e UTMs', color: 'var(--chart-1)' },
    slug: { label: 'ID do vídeo na UTM', hint: 'A UTM não está cadastrada, mas traz o ID do vídeo', color: 'var(--chart-3)' },
    alias: { label: 'Vínculo manual', hint: 'UTM vinculada a um vídeo nesta tela', color: 'var(--chart-4)' },
    bucket: { label: 'Destino genérico', hint: 'UTM que não pertence a um vídeo específico', color: 'var(--chart-5)' },
    unattributed: { label: 'Sem vídeo', hint: 'UTM de YouTube que ainda não foi ligada a nada', color: 'var(--line-strong)' },
};
const METHOD_ORDER: AttributionMethod[] = ['link', 'slug', 'alias', 'bucket', 'unattributed'];

/** Parte-do-todo da receita por método de atribuição, com a tabela de valores ao lado. */
const CoverageBreakdown: React.FC<{ coverage: Coverage }> = ({ coverage }) => {
    const rows = METHOD_ORDER
        .map((method) => coverage.methods.find((m) => m.method === method))
        .filter((m): m is Coverage['methods'][number] => !!m && (m.deals > 0 || m.revenue > 0));
    const total = coverage.totalRevenue || 1;

    return (
        <div className="space-y-4">
            <div className="flex h-3 w-full gap-0.5" role="img" aria-label="Receita por método de atribuição">
                {rows.map((m) => (
                    <div
                        key={m.method}
                        title={`${METHOD_META[m.method].label}: ${fmtBRL(m.revenue)} (${fmtPct(m.revenue / total)})`}
                        className="h-full first:rounded-l last:rounded-r min-w-[3px]"
                        style={{ width: `${(m.revenue / total) * 100}%`, background: METHOD_META[m.method].color }}
                    />
                ))}
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-fg-subtle">
                        <th className="text-left font-medium pb-1.5">Método</th>
                        <th className="text-right font-medium pb-1.5">Negócios</th>
                        <th className="text-right font-medium pb-1.5">Vendas</th>
                        <th className="text-right font-medium pb-1.5">Receita</th>
                        <th className="text-right font-medium pb-1.5">% da receita</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((m) => (
                        <tr key={m.method} className="border-t border-line">
                            <td className="py-2">
                                <span className="inline-flex items-center gap-2" title={METHOD_META[m.method].hint}>
                                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: METHOD_META[m.method].color }} />
                                    {METHOD_META[m.method].label}
                                </span>
                            </td>
                            <td className="py-2 text-right tabular">{fmtInt(m.deals)}</td>
                            <td className="py-2 text-right tabular">{fmtInt(m.won)}</td>
                            <td className="py-2 text-right tabular">{fmtBRL(m.revenue)}</td>
                            <td className="py-2 text-right tabular text-fg-muted">{fmtPct(m.revenue / total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const VideoOption: React.FC<{ video: VideoRef; selected: boolean; onSelect: () => void }> = ({ video, selected, onSelect }) => (
    <button
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
            'w-full flex items-center gap-3 p-2 rounded-md border text-left transition-colors',
            selected ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-hover',
        )}
    >
        {video.thumbnail_url
            ? <img src={video.thumbnail_url} alt="" className="h-10 w-[72px] rounded object-cover shrink-0" />
            : <div className="h-10 w-[72px] rounded bg-surface-2 shrink-0" />}
        <div className="min-w-0 flex-1">
            <div className="text-sm text-fg truncate">{video.title}</div>
            <div className="text-xs text-fg-subtle">{fmtDate(video.published_at)} · {video.video_id}</div>
        </div>
        {selected && <CheckCircle2 size={16} className="text-accent shrink-0" />}
    </button>
);

const LinkModal: React.FC<{ orphan: Orphan; onClose: () => void }> = ({ orphan, onClose }) => {
    const toast = useToast();
    const save = useSaveAlias();
    const [mode, setMode] = useState<'video' | 'bucket'>(orphan.candidates.length ? 'video' : 'video');
    const [videoId, setVideoId] = useState<string | null>(orphan.candidates.length === 1 ? orphan.candidates[0].video_id : null);
    const [bucket, setBucket] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<VideoRef[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        const timer = setTimeout(() => {
            searchVideos(q)
                .then(setResults)
                .catch((e) => toast(e.message, 'error'))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [query, toast]);

    const options = query.trim().length >= 2 ? results : orphan.candidates;
    const canSave = mode === 'video' ? !!videoId : bucket.trim().length > 0;

    const submit = () => {
        save.mutate(
            mode === 'video' ? { utm: orphan.utm, videoId: videoId! } : { utm: orphan.utm, bucket: bucket.trim() },
            {
                onSuccess: () => {
                    toast(`${fmtInt(orphan.deals)} negócios vinculados (${fmtBRL(orphan.revenue)} em vendas).`, 'success');
                    onClose();
                },
                onError: (e) => toast(e.message, 'error'),
            },
        );
    };

    return (
        <Modal
            title="Vincular UTM"
            subtitle={<span className="font-mono">{orphan.utm}</span>}
            onClose={onClose}
            width="max-w-xl"
            footer={<>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={submit} disabled={!canSave} loading={save.isPending}>Vincular {fmtInt(orphan.deals)} negócios</Button>
            </>}
        >
            <div className="flex gap-2 mb-4">
                <Button size="sm" variant={mode === 'video' ? 'primary' : 'secondary'} onClick={() => setMode('video')}>A um vídeo</Button>
                <Button size="sm" variant={mode === 'bucket' ? 'primary' : 'secondary'} onClick={() => setMode('bucket')}>A um destino genérico</Button>
            </div>

            {mode === 'video' ? (
                <div className="space-y-3">
                    <label className="flex items-center gap-2 h-9 px-3 rounded-md bg-surface-2 border border-line">
                        <Search size={14} className="text-fg-subtle" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar vídeo por título ou ID"
                            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
                        />
                    </label>
                    {query.trim().length < 2 && orphan.candidates.length > 0 && (
                        <p className="text-xs text-fg-muted">Vídeos publicados na data que aparece na UTM:</p>
                    )}
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {options.map((v) => (
                            <VideoOption key={v.video_id} video={v} selected={v.video_id === videoId} onSelect={() => setVideoId(v.video_id)} />
                        ))}
                        {options.length === 0 && (
                            <p className="text-xs text-fg-muted py-6 text-center">
                                {searching ? 'Buscando…' : query.trim().length >= 2 ? 'Nenhum vídeo encontrado.' : 'A UTM não indica uma data. Busque o vídeo pelo título.'}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-fg-muted">
                        Use quando a UTM não pertence a um vídeo específico (link fixo do canal, da bio, de um comentário fixado).
                        A receita passa a contar como YouTube atribuído, sem entrar no ranking de vídeos.
                    </p>
                    <input
                        value={bucket}
                        onChange={(e) => setBucket(e.target.value)}
                        placeholder="Ex.: Link fixo do canal"
                        className="w-full h-9 px-3 rounded-md bg-surface-2 border border-line text-sm text-fg placeholder:text-fg-subtle"
                    />
                </div>
            )}
        </Modal>
    );
};

export const AttributionPage: React.FC = () => {
    const toast = useToast();
    const coverage = useCoverage();
    const orphans = useOrphans();
    const aliases = useAliases();
    const removeAlias = useDeleteAlias();
    const [linking, setLinking] = useState<Orphan | null>(null);

    const unattributed = coverage.data?.methods.find((m) => m.method === 'unattributed');

    const orphanColumns = useMemo<Column<Orphan>[]>(() => [
        { id: 'utm', header: 'UTM (utm_content)', cell: (o) => <span className="font-mono text-xs">{o.utm}</span>, sortValue: (o) => o.utm },
        { id: 'deals', header: 'Negócios', align: 'right', cell: (o) => fmtInt(o.deals), sortValue: (o) => o.deals },
        { id: 'won', header: 'Vendas', align: 'right', cell: (o) => fmtInt(o.won), sortValue: (o) => o.won },
        { id: 'revenue', header: 'Receita', align: 'right', cell: (o) => fmtBRL(o.revenue), sortValue: (o) => o.revenue },
        { id: 'last', header: 'Último negócio', align: 'right', cell: (o) => fmtDate(o.lastDeal), sortValue: (o) => o.lastDeal, hint: 'UTMs com negócios recentes ainda estão em uso em alguma descrição' },
        {
            id: 'action', header: '', align: 'right',
            cell: (o) => <Button size="sm" icon={<Link2 size={13} />} onClick={() => setLinking(o)}>Vincular</Button>,
        },
    ], []);

    const aliasColumns = useMemo<Column<Alias>[]>(() => [
        { id: 'utm', header: 'UTM', cell: (a) => <span className="font-mono text-xs">{a.utm_content}</span> },
        {
            id: 'target', header: 'Vinculada a',
            cell: (a) => a.video_id
                ? <span className="truncate">{a.video_title || a.video_id}</span>
                : <Badge tone="accent">{a.bucket}</Badge>,
        },
        { id: 'date', header: 'Criado em', align: 'right', cell: (a) => fmtDate(a.created_at) },
        {
            id: 'action', header: '', align: 'right',
            cell: (a) => (
                <Button
                    size="sm" variant="ghost" icon={<Trash2 size={13} />}
                    onClick={() => removeAlias.mutate(a.utm_content, {
                        onSuccess: () => toast('Vínculo removido.', 'info'),
                        onError: (e) => toast(e.message, 'error'),
                    })}
                >
                    Desfazer
                </Button>
            ),
        },
    ], [removeAlias, toast]);

    if (coverage.error) return <ErrorState error={coverage.error} onRetry={() => coverage.refetch()} />;

    return (
        <div className="space-y-5 max-w-6xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Receita atribuída a vídeo" value={fmtBRL(coverage.data?.attributedRevenue)} hint={`${fmtPct(coverage.data?.revenueCoverage)} da receita do YouTube`} loading={coverage.isLoading} />
                <KpiCard label="Receita sem vídeo" value={fmtBRL(unattributed?.revenue ?? (coverage.data ? 0 : undefined))} hint={`${fmtInt(unattributed?.won ?? 0)} vendas a recuperar`} loading={coverage.isLoading} />
                <KpiCard label="Negócios atribuídos" value={fmtPct(coverage.data?.dealCoverage)} hint={`${fmtInt(coverage.data?.attributedDeals)} de ${fmtInt(coverage.data?.totalDeals)}`} loading={coverage.isLoading} />
                <KpiCard label="UTMs sem vídeo" value={fmtInt(orphans.data?.length)} hint="Cada uma se resolve com um vínculo" loading={orphans.isLoading} />
            </div>

            <Section title="De onde vem a atribuição" description="Negócios do HubSpot com UTM de YouTube, todo o histórico. Receita = negócios ganhos.">
                {coverage.data && <CoverageBreakdown coverage={coverage.data} />}
            </Section>

            <Section
                title="UTMs sem vídeo"
                description="Negócios que chegaram com uma UTM de YouTube que não corresponde a nenhum link. Vincule ao vídeo certo para a receita entrar no ranking."
                flush
            >
                {orphans.error
                    ? <ErrorState error={orphans.error} onRetry={() => orphans.refetch()} />
                    : (
                        <DataTable
                            columns={orphanColumns}
                            rows={orphans.data || []}
                            rowKey={(o) => o.utm}
                            loading={orphans.isLoading}
                            initialSort={{ id: 'revenue', dir: 'desc' }}
                            empty={<EmptyState icon={<CheckCircle2 size={24} className="text-positive" />} title="Tudo atribuído" description="Nenhuma UTM de YouTube está sem vídeo." />}
                        />
                    )}
            </Section>

            {(aliases.data?.length ?? 0) > 0 && (
                <Section title="Vínculos manuais" description="Desfazer devolve a UTM para a lista acima." flush>
                    <DataTable columns={aliasColumns} rows={aliases.data || []} rowKey={(a) => a.utm_content} />
                </Section>
            )}

            {linking && <LinkModal orphan={linking} onClose={() => setLinking(null)} />}
        </div>
    );
};

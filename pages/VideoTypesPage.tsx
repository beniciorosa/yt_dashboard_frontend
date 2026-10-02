import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import {
    classifyVideos, Dimension, DIMENSION_LABELS, TypedVideo, useTypedVideos, useVideoTypeMutations, useVideoTypes, VideoType, VideoTypesOverview,
} from '../features/revenue/api';
import { Badge, Button, Card, ErrorState, Modal, Section, Segmented, Skeleton, useToast } from '../components/ui';
import { fmtDate, fmtInt, fmtPct } from '../lib/format';

const PAGE_SIZE = 60;

const TypeEditor: React.FC<{ dimension: Dimension; type?: VideoType; onClose: () => void }> = ({ dimension, type, onClose }) => {
    const toast = useToast();
    const { create, update } = useVideoTypeMutations();
    const [name, setName] = useState(type?.name || '');
    const [description, setDescription] = useState(type?.description || '');
    const pending = create.isPending || update.isPending;

    const submit = () => {
        const done = { onSuccess: onClose, onError: (e: Error) => toast(e.message, 'error') };
        if (type) update.mutate({ id: type.id, name, description }, done);
        else create.mutate({ dimension, name, description }, done);
    };

    const inputCls = 'w-full px-3 rounded-md bg-surface-2 border border-line text-sm text-fg placeholder:text-fg-subtle';
    return (
        <Modal
            title={type ? 'Editar tipo' : `Novo tipo · ${DIMENSION_LABELS[dimension]}`}
            onClose={onClose}
            footer={<>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={submit} disabled={!name.trim()} loading={pending}>Salvar</Button>
            </>}
        >
            <div className="space-y-3">
                <label className="block">
                    <span className="text-xs font-medium text-fg-muted">Nome</span>
                    <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} h-9 mt-1`} />
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-fg-muted">Quando usar (a IA lê esta descrição ao classificar)</span>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} py-2 mt-1`} />
                </label>
            </div>
        </Modal>
    );
};

const Taxonomy: React.FC<{ overview: VideoTypesOverview }> = ({ overview }) => {
    const toast = useToast();
    const { remove } = useVideoTypeMutations();
    const [editing, setEditing] = useState<{ dimension: Dimension; type?: VideoType } | null>(null);

    return (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {overview.dimensions.map((d) => (
                <Card key={d.dimension} className="flex flex-col">
                    <div className="px-4 py-3 border-b border-line">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-fg">{DIMENSION_LABELS[d.dimension]}</h3>
                            <span className="text-xs text-fg-subtle tabular" title="Vídeos classificados nesta dimensão">
                                {fmtPct(overview.totalVideos ? d.classified / overview.totalVideos : null, 0)}
                            </span>
                        </div>
                        <p className="text-xs text-fg-muted mt-0.5">{d.guide}</p>
                    </div>
                    <ul className="flex-1 p-2 space-y-0.5">
                        {d.types.map((t) => (
                            <li key={t.id} className="group flex items-center gap-2 h-8 px-2 rounded hover:bg-surface-hover" title={t.description || undefined}>
                                <span className="flex-1 truncate text-sm text-fg">{t.name}</span>
                                <span className="text-xs text-fg-subtle tabular">{fmtInt(t.videos)}</span>
                                <button aria-label={`Editar ${t.name}`} onClick={() => setEditing({ dimension: d.dimension, type: t })} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-fg-subtle hover:text-fg"><Pencil size={13} /></button>
                                <button
                                    aria-label={`Excluir ${t.name}`}
                                    onClick={() => {
                                        if (window.confirm(`Excluir "${t.name}"? ${t.videos} vídeo(s) ficam sem tipo nesta dimensão.`)) {
                                            remove.mutate(t.id, { onError: (e) => toast(e.message, 'error') });
                                        }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-fg-subtle hover:text-negative"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </li>
                        ))}
                        {d.types.length === 0 && <li className="px-2 py-3 text-xs text-fg-subtle">Nenhum tipo ainda. A IA propõe na primeira classificação.</li>}
                    </ul>
                    <div className="p-2 border-t border-line">
                        <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setEditing({ dimension: d.dimension })}>Adicionar tipo</Button>
                    </div>
                </Card>
            ))}
            {editing && <TypeEditor dimension={editing.dimension} type={editing.type} onClose={() => setEditing(null)} />}
        </div>
    );
};

const VideoRow: React.FC<{ video: TypedVideo; overview: VideoTypesOverview }> = ({ video, overview }) => {
    const toast = useToast();
    const { assign } = useVideoTypeMutations();
    return (
        <tr className="border-b border-line last:border-b-0">
            <td className="py-2 pl-4 pr-3">
                <div className="flex items-center gap-3 min-w-0">
                    {video.thumbnailUrl
                        ? <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-9 w-16 rounded object-cover shrink-0" />
                        : <div className="h-9 w-16 rounded bg-surface-2 shrink-0" />}
                    <div className="min-w-0">
                        <div className="text-sm text-fg truncate max-w-md">{video.title}</div>
                        <div className="text-xs text-fg-subtle">{fmtDate(video.publishedAt)}</div>
                    </div>
                </div>
            </td>
            {overview.dimensions.map((d) => {
                const current = video.types[d.dimension];
                return (
                    <td key={d.dimension} className="py-2 px-1.5">
                        <select
                            value={current?.typeId ?? ''}
                            aria-label={`${DIMENSION_LABELS[d.dimension]} de ${video.title}`}
                            title={current ? (current.source === 'manual' ? 'Definido manualmente' : 'Sugerido pela IA') : undefined}
                            onChange={(e) => assign.mutate(
                                { videoId: video.videoId, dimension: d.dimension, typeId: e.target.value ? Number(e.target.value) : null },
                                { onError: (err) => toast(err.message, 'error') },
                            )}
                            className={`h-7 w-full max-w-[170px] px-1.5 rounded bg-surface-2 border text-xs ${current ? (current.source === 'manual' ? 'border-accent text-fg' : 'border-line text-fg') : 'border-line text-fg-subtle'}`}
                        >
                            <option value="">—</option>
                            {d.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </td>
                );
            })}
        </tr>
    );
};

export const VideoTypesPage: React.FC = () => {
    const toast = useToast();
    const overview = useVideoTypes();
    const videos = useTypedVideos();
    const { invalidate } = useVideoTypeMutations();
    const [classifying, setClassifying] = useState<{ done: number; remaining: number } | null>(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'missing'>('all');
    const [limit, setLimit] = useState(PAGE_SIZE);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const dims = overview.data?.dimensions.map((d) => d.dimension) || [];
        return (videos.data || []).filter((v) =>
            (!q || v.title.toLowerCase().includes(q)) && (filter === 'all' || dims.some((d) => !v.types[d])));
    }, [videos.data, overview.data, query, filter]);

    const classify = async () => {
        setClassifying({ done: 0, remaining: 0 });
        try {
            let done = 0;
            // resumível: cada chamada classifica o que cabe em ~40 s
            for (let round = 0; round < 60; round++) {
                const r = await classifyVideos();
                done += r.classified;
                setClassifying({ done, remaining: r.remaining });
                if (r.remaining === 0 || r.classified === 0) break;
            }
            toast(`${fmtInt(done)} vídeos classificados pela IA.`, 'success');
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setClassifying(null);
            await invalidate();
        }
    };

    if (overview.error) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fg-muted max-w-2xl">
                    Cada vídeo recebe um tipo por dimensão. A IA sugere a partir do título e da descrição; o que você ajustar à mão
                    <Badge tone="accent" className="mx-1">borda azul</Badge> nunca é sobrescrito.
                </p>
                <Button variant="primary" icon={<Sparkles size={14} />} loading={!!classifying} onClick={classify}>
                    {classifying ? `Classificando… ${fmtInt(classifying.done)} feitos, ${fmtInt(classifying.remaining)} restantes` : 'Classificar com IA'}
                </Button>
            </div>

            {overview.isLoading ? <Skeleton className="h-56 w-full" /> : overview.data && <Taxonomy overview={overview.data} />}

            <Section
                title="Vídeos"
                description={`${fmtInt(filtered.length)} de ${fmtInt(videos.data?.length)} vídeos`}
                actions={<>
                    <label className="flex items-center gap-2 h-7 px-2 rounded-md bg-surface-2 border border-line">
                        <Search size={13} className="text-fg-subtle" />
                        <input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }} placeholder="Buscar título" className="w-40 bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none" />
                    </label>
                    <Segmented items={[{ id: 'all', label: 'Todos' }, { id: 'missing', label: 'Sem tipo' }]} value={filter} onChange={(f) => { setFilter(f); setLimit(PAGE_SIZE); }} />
                </>}
                flush
            >
                {videos.error && <ErrorState error={videos.error} onRetry={() => videos.refetch()} />}
                {videos.isLoading && <div className="p-4"><Skeleton className="h-40 w-full" /></div>}
                {overview.data && videos.data && (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="h-9 pl-4 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle border-b border-line">Vídeo</th>
                                    {overview.data.dimensions.map((d) => (
                                        <th key={d.dimension} className="h-9 px-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle border-b border-line">{DIMENSION_LABELS[d.dimension]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.slice(0, limit).map((v) => <VideoRow key={v.videoId} video={v} overview={overview.data!} />)}
                            </tbody>
                        </table>
                        {filtered.length > limit && (
                            <div className="p-3 text-center border-t border-line">
                                <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>Mostrar mais {Math.min(PAGE_SIZE, filtered.length - limit)}</Button>
                            </div>
                        )}
                    </div>
                )}
            </Section>
        </div>
    );
};

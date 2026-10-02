import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post } from '../../lib/api';
import type { Period } from '../../lib/period';

// ---------- Atribuição ----------

export type AttributionMethod = 'link' | 'slug' | 'alias' | 'bucket' | 'unattributed';

export interface Coverage {
    methods: { method: AttributionMethod; deals: number; won: number; revenue: number }[];
    totalDeals: number;
    attributedDeals: number;
    totalRevenue: number;
    attributedRevenue: number;
    dealCoverage: number | null;
    revenueCoverage: number | null;
}

export interface VideoRef {
    video_id: string;
    title: string;
    thumbnail_url: string | null;
    published_at: string | null;
}

export interface Orphan {
    utm: string;
    deals: number;
    won: number;
    revenue: number;
    firstDeal: string | null;
    lastDeal: string | null;
    candidates: VideoRef[];
}

export interface Alias {
    utm_content: string;
    video_id: string | null;
    video_title: string | null;
    bucket: string | null;
    note: string | null;
    created_at: string;
}

export const useCoverage = () => useQuery({ queryKey: ['attribution', 'coverage'], queryFn: () => api<Coverage>('/attribution/coverage') });
export const useOrphans = () => useQuery({ queryKey: ['attribution', 'orphans'], queryFn: () => api<Orphan[]>('/attribution/orphans') });
export const useAliases = () => useQuery({ queryKey: ['attribution', 'aliases'], queryFn: () => api<Alias[]>('/attribution/aliases') });

export const searchVideos = (q: string) => api<VideoRef[]>(`/attribution/videos?q=${encodeURIComponent(q)}`);

/** Vincular ou desvincular muda cobertura, órfãs, vendas e closers: invalida tudo de uma vez. */
const useInvalidateRevenue = () => {
    const qc = useQueryClient();
    return () => Promise.all(['attribution', 'closers', 'sales'].map((key) => qc.invalidateQueries({ queryKey: [key] })));
};

export const useSaveAlias = () => {
    const invalidate = useInvalidateRevenue();
    return useMutation({
        mutationFn: (input: { utm: string; videoId?: string; bucket?: string; note?: string }) => post<Alias>('/attribution/aliases', input),
        onSuccess: invalidate,
    });
};

export const useDeleteAlias = () => {
    const invalidate = useInvalidateRevenue();
    return useMutation({
        mutationFn: (utm: string) => api(`/attribution/aliases?utm=${encodeURIComponent(utm)}`, { method: 'DELETE' }),
        onSuccess: invalidate,
    });
};

// ---------- Closers ----------

export type CloserScope = 'youtube' | 'all';
export type OwnerRole = 'closer' | 'sdr' | 'outro';

export interface CloserRow {
    ownerName: string;
    ownerId: number | null;
    role: OwnerRole | null;
    inferredRole: OwnerRole;
    leads: number;
    won: number;
    lost: number;
    revenue: number;
    winRate: number | null;
    avgTicket: number | null;
    avgCycleDays: number | null;
    /** null enquanto o sync direto do HubSpot não trouxe as datas de reunião. */
    meetingsScheduled: number | null;
    meetingsHeld: number | null;
    showRate: number | null;
    meetingToWin: number | null;
}

export interface CloserStats {
    start: string;
    end: string;
    scope: CloserScope;
    totals: { leads: number; won: number; lost: number; revenue: number; winRate: number | null; avgTicket: number | null };
    rows: CloserRow[];
}

const rangeQs = (p: Period) => {
    const qs = new URLSearchParams();
    if (p.start) qs.set('start', p.start);
    if (p.end) qs.set('end', p.end);
    return qs;
};

export const closerStatsKey = (p: Period, scope: CloserScope) => ['closers', 'stats', p.start ?? null, p.end ?? null, scope];

export const useCloserStats = (p: Period | null, scope: CloserScope) => useQuery({
    queryKey: p ? closerStatsKey(p, scope) : ['closers', 'stats', 'none'],
    queryFn: () => {
        const qs = rangeQs(p!);
        qs.set('scope', scope);
        return api<CloserStats>(`/closers?${qs}`);
    },
    enabled: !!p,
});

export const DIMENSIONS = ['tema', 'formato', 'publico', 'produto'] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export const DIMENSION_LABELS: Record<Dimension, string> = { tema: 'Tema', formato: 'Formato', publico: 'Público', produto: 'Produto-alvo' };

export interface MatrixCell {
    ownerName: string;
    typeId: number;
    typeName: string;
    closed: number;
    won: number;
    revenue: number;
    winRate: number | null;
}

export interface CloserMatrix {
    dimension: Dimension;
    types: { typeId: number; typeName: string; closed: number; won: number; revenue: number; winRate: number | null }[];
    cells: MatrixCell[];
}

export const closerMatrixKey = (p: Period, dimension: Dimension) => ['closers', 'matrix', p.start ?? null, p.end ?? null, dimension];

export const useCloserMatrix = (p: Period, dimension: Dimension, enabled = true) => useQuery({
    queryKey: closerMatrixKey(p, dimension),
    queryFn: () => {
        const qs = rangeQs(p);
        qs.set('dimension', dimension);
        return api<CloserMatrix>(`/closers/matrix?${qs}`);
    },
    enabled,
});

export const useSetOwnerRole = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ ownerId, role }: { ownerId: number; role: OwnerRole | null }) =>
            api(`/closers/owners/${ownerId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['closers'] }),
    });
};

// ---------- HubSpot ----------

export const useHubspotStatus = () => useQuery({ queryKey: ['hubspot', 'status'], queryFn: () => api<{ configured: boolean }>('/hubspot/status') });

export interface HubspotSyncSummary { deals: number; caughtUp: boolean }
export const runHubspotSync = () => api<HubspotSyncSummary>('/hubspot/sync');

// ---------- Tipos de vídeo ----------

export interface VideoType {
    id: number;
    dimension: Dimension;
    name: string;
    description: string | null;
    videos: number;
}

export interface VideoTypesOverview {
    totalVideos: number;
    dimensions: { dimension: Dimension; guide: string; classified: number; types: VideoType[] }[];
}

export interface TypedVideo {
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    publishedAt: string | null;
    types: Partial<Record<Dimension, { typeId: number; source: 'ia' | 'manual' }>>;
}

export const useVideoTypes = () => useQuery({ queryKey: ['video-types', 'overview'], queryFn: () => api<VideoTypesOverview>('/video-types') });
export const useTypedVideos = () => useQuery({ queryKey: ['video-types', 'videos'], queryFn: () => api<TypedVideo[]>('/video-types/videos') });

export const classifyVideos = () => post<{ createdTypes: number; classified: number; remaining: number }>('/video-types/classify');

export const useVideoTypeMutations = () => {
    const qc = useQueryClient();
    const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ['video-types'] }), qc.invalidateQueries({ queryKey: ['closers', 'matrix'] })]);
    return {
        invalidate,
        create: useMutation({
            mutationFn: (input: { dimension: Dimension; name: string; description?: string }) => post('/video-types', input),
            onSuccess: invalidate,
        }),
        update: useMutation({
            mutationFn: ({ id, ...patch }: { id: number; name?: string; description?: string }) =>
                api(`/video-types/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
            onSuccess: invalidate,
        }),
        remove: useMutation({
            mutationFn: (id: number) => api(`/video-types/${id}`, { method: 'DELETE' }),
            onSuccess: invalidate,
        }),
        assign: useMutation({
            mutationFn: (input: { videoId: string; dimension: Dimension; typeId: number | null }) =>
                api('/video-types/assignments', { method: 'PUT', body: JSON.stringify(input) }),
            onSuccess: invalidate,
        }),
    };
};

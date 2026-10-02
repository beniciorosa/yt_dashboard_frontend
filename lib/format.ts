// Formatadores pt-BR compartilhados. Valores ausentes viram "—" em vez de 0, para não
// confundir "sem dado" com "zero".
const EMPTY = '—';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtInt = (v?: number | null) => (isNum(v) ? int.format(v) : EMPTY);
export const fmtCompact = (v?: number | null) => (isNum(v) ? compact.format(v) : EMPTY);
export const fmtBRL = (v?: number | null, cents = false) => (isNum(v) ? (cents ? brlCents : brl).format(v) : EMPTY);

/** `v` em fração (0.123 → "12,3%"). */
export const fmtPct = (v?: number | null, digits = 1) =>
    isNum(v) ? `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%` : EMPTY;

export const fmtDuration = (seconds?: number | null) => {
    if (!isNum(seconds)) return EMPTY;
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

export const fmtHours = (minutes?: number | null) => (isNum(minutes) ? `${fmtCompact(minutes / 60)} h` : EMPTY);

/** Datas sem hora (yyyy-mm-dd) são datas de calendário: não passam por fuso. */
const parseDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso));

export const fmtDate = (iso?: string | null) =>
    iso ? parseDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ de /g, ' ').replace('.', '') : EMPTY;

export const fmtRelative = (iso?: string | null) => {
    if (!iso) return 'nunca';
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    const h = Math.round(diffMin / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24);
    return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
};

/** Variação relativa entre dois períodos; null quando não há base de comparação. */
export const delta = (current?: number | null, previous?: number | null): number | null =>
    isNum(current) && isNum(previous) && previous !== 0 ? (current - previous) / Math.abs(previous) : null;

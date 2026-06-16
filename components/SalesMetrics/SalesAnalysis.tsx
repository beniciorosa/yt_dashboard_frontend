import React, { useEffect, useState } from 'react';
import {
    fetchSalesAnalysis, fetchAiSummary,
    AnalysisParams, AnalysisResult, AnalysisKpi,
} from '../../services/salesMetricsService';
import { SalesDetailsModal } from './SalesDetailsModal';
import {
    DollarSign, BarChart2, ShoppingBag, TrendingUp, Percent,
    ArrowUp, ArrowDown, Minus, TrendingDown, Flame, Snowflake,
    Users, Sparkles, Loader2, Calendar,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

type Comparison = 'month_vs_last' | 'last30_vs_prev30' | 'year_vs_last' | 'custom';

const resolveParams = (
    comparison: Comparison,
    custom: { aStart: string; aEnd: string; bStart: string; bEnd: string },
    sellerScope: 'youtube' | 'all',
): AnalysisParams => {
    const now = new Date();
    if (comparison === 'month_vs_last') {
        const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastLast = new Date(now.getFullYear(), now.getMonth(), 0);
        return { periodA: 'month', periodB: 'custom', startB: toYMD(firstLast), endB: toYMD(lastLast), sellerScope };
    }
    if (comparison === 'last30_vs_prev30') {
        const aStart = new Date(now); aStart.setDate(aStart.getDate() - 30);
        const bStart = new Date(now); bStart.setDate(bStart.getDate() - 60);
        const bEnd = new Date(now); bEnd.setDate(bEnd.getDate() - 30);
        return { periodA: 'custom', startA: toYMD(aStart), endA: toYMD(now), periodB: 'custom', startB: toYMD(bStart), endB: toYMD(bEnd), sellerScope };
    }
    if (comparison === 'year_vs_last') {
        const firstLastY = new Date(now.getFullYear() - 1, 0, 1);
        const lastLastY = new Date(now.getFullYear() - 1, 11, 31);
        return { periodA: 'year', periodB: 'custom', startB: toYMD(firstLastY), endB: toYMD(lastLastY), sellerScope };
    }
    return { periodA: 'custom', startA: custom.aStart, endA: custom.aEnd, periodB: 'custom', startB: custom.bStart, endB: custom.bEnd, sellerScope };
};

const DeltaBadge: React.FC<{ value: number; suffix?: string; invert?: boolean }> = ({ value, suffix = '%', invert = false }) => {
    const positive = invert ? value < 0 : value > 0;
    const neutral = Math.abs(value) < 0.05;
    const color = neutral ? 'text-gray-400 bg-gray-100 dark:bg-gray-700' : positive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20';
    const Icon = neutral ? Minus : value > 0 ? ArrowUp : ArrowDown;
    return (
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${color}`}>
            <Icon size={12} />{Math.abs(value).toFixed(suffix === ' pp' ? 1 : 0)}{suffix}
        </span>
    );
};

export const SalesAnalysis: React.FC = () => {
    const [comparison, setComparison] = useState<Comparison>('month_vs_last');
    const now = new Date();
    const [custom, setCustom] = useState({
        aStart: toYMD(new Date(now.getFullYear(), now.getMonth(), 1)),
        aEnd: toYMD(now),
        bStart: toYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        bEnd: toYMD(new Date(now.getFullYear(), now.getMonth(), 0)),
    });
    const [sellerScope, setSellerScope] = useState<'youtube' | 'all'>('youtube');
    const [data, setData] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);

    const [aiSummary, setAiSummary] = useState<string>('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setAiSummary(''); setAiError('');
            const params = resolveParams(comparison, custom, sellerScope);
            const res = await fetchSalesAnalysis(params);
            setData(res);
            setLoading(false);
        };
        load();
    }, [comparison, custom, sellerScope]);

    const handleAi = async () => {
        if (!data) return;
        setAiLoading(true); setAiError('');
        try {
            const summary = await fetchAiSummary(data);
            setAiSummary(summary);
        } catch {
            setAiError('Não foi possível gerar o resumo com IA agora. As análises por regras acima seguem válidas.');
        } finally {
            setAiLoading(false);
        }
    };

    const k = data?.kpis;
    const cooled = (data?.videoMovers || []).filter(v => v.status === 'sumiu' || v.status === 'esfriou').slice(0, 6);
    const heated = (data?.videoMovers || []).filter(v => v.status === 'aqueceu' || v.status === 'novo')
        .sort((a, b) => b.deltaLeads - a.deltaLeads).slice(0, 6);

    const KpiCard = ({ title, icon: Icon, color, aVal, bVal, delta, deltaSuffix = '%', invert = false }: any) => (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}><Icon size={16} className={color} /></div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            </div>
            <div className="flex items-end justify-between gap-2">
                <div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{loading ? '—' : aVal}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">vs {loading ? '—' : bVal}</div>
                </div>
                {!loading && data && <DeltaBadge value={delta} suffix={deltaSuffix} invert={invert} />}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Análises comparativas</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Compare dois períodos e descubra o que está aquecendo, o que esfriou e o que fazer a respeito.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <Calendar size={16} className="text-gray-400 ml-1" />
                        <select value={comparison} onChange={e => setComparison(e.target.value as Comparison)}
                            className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none pr-6 cursor-pointer">
                            <option value="month_vs_last">Mês atual × Mês passado</option>
                            <option value="last30_vs_prev30">Últimos 30d × 30d anteriores</option>
                            <option value="year_vs_last">Este ano × Ano passado</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    {/* Toggle escopo vendedor */}
                    <div className="flex items-center bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-xs font-semibold">
                        <button onClick={() => setSellerScope('youtube')} className={`px-3 py-1.5 rounded-lg transition-colors ${sellerScope === 'youtube' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>YouTube</button>
                        <button onClick={() => setSellerScope('all')} className={`px-3 py-1.5 rounded-lg transition-colors ${sellerScope === 'all' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>Todos</button>
                    </div>
                </div>
            </div>

            {comparison === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">Período A:</span>
                        <input type="date" value={custom.aStart} onChange={e => setCustom(c => ({ ...c, aStart: e.target.value }))} className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1" />
                        <span className="text-gray-400">até</span>
                        <input type="date" value={custom.aEnd} onChange={e => setCustom(c => ({ ...c, aEnd: e.target.value }))} className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-500">Comparar com (B):</span>
                        <input type="date" value={custom.bStart} onChange={e => setCustom(c => ({ ...c, bStart: e.target.value }))} className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1" />
                        <span className="text-gray-400">até</span>
                        <input type="date" value={custom.bEnd} onChange={e => setCustom(c => ({ ...c, bEnd: e.target.value }))} className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1" />
                    </div>
                </div>
            )}

            {/* KPIs com delta */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard title="Receita" icon={DollarSign} color="text-emerald-500" aVal={formatBRL(k?.a.revenue || 0)} bVal={formatBRL(k?.b.revenue || 0)} delta={k?.delta.revenue || 0} />
                <KpiCard title="Leads" icon={BarChart2} color="text-blue-500" aVal={k?.a.leads ?? 0} bVal={k?.b.leads ?? 0} delta={k?.delta.leads || 0} />
                <KpiCard title="Vendas" icon={ShoppingBag} color="text-indigo-500" aVal={k?.a.won ?? 0} bVal={k?.b.won ?? 0} delta={k?.delta.won || 0} />
                <KpiCard title="Conversão" icon={Percent} color="text-amber-500" aVal={`${(k?.a.conversionRate || 0).toFixed(1)}%`} bVal={`${(k?.b.conversionRate || 0).toFixed(1)}%`} delta={k?.delta.conversionRate || 0} deltaSuffix=" pp" />
                <KpiCard title="Ticket Médio" icon={TrendingUp} color="text-rose-500" aVal={formatBRL(k?.a.avgTicket || 0)} bVal={formatBRL(k?.b.avgTicket || 0)} delta={k?.delta.avgTicket || 0} />
            </div>

            {/* Gráfico de captação diária (período atual) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">Captação de leads por dia — período atual (A)</h3>
                {loading ? (
                    <div className="h-56 flex items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
                ) : (data?.timeline.a.length || 0) === 0 ? (
                    <div className="h-56 flex items-center justify-center text-gray-400 text-sm">Sem leads no período.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={224}>
                        <AreaChart data={data?.timeline.a}>
                            <defs>
                                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip formatter={(v: any, n: any) => n === 'revenue' ? formatBRL(v) : v} labelFormatter={(l) => fmtDate(l)} />
                            <Area type="monotone" dataKey="leads" stroke="#10b981" fill="url(#leadsGrad)" strokeWidth={2} name="Leads" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Movers de vídeo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MoverList title="Esfriaram / pararam de captar" icon={Snowflake} iconColor="text-blue-500" items={cooled} onSelect={setSelectedVideo} loading={loading} emptyMsg="Nenhum vídeo esfriou no período." />
                <MoverList title="Aqueceram" icon={Flame} iconColor="text-orange-500" items={heated} onSelect={setSelectedVideo} loading={loading} emptyMsg="Nenhum vídeo aqueceu no período." />
            </div>

            {/* Análise por vendedor */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> Análise por Vendedor</h3>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-md">{sellerScope === 'youtube' ? 'Atribuídos ao YouTube' : 'Todos os negócios'}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Vendedor</th>
                                <th className="px-5 py-3 text-center">Leads (B→A)</th>
                                <th className="px-5 py-3 text-center">Vendas (B→A)</th>
                                <th className="px-5 py-3 text-center">Conversão</th>
                                <th className="px-5 py-3 text-right">Receita (B→A)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400"><Loader2 className="animate-spin inline" /></td></tr>
                            ) : (data?.sellerMovers || []).length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Sem dados.</td></tr>
                            ) : (
                                data?.sellerMovers.map(s => (
                                    <tr key={s.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{s.name}</td>
                                        <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-300">{s.b.leads} → <strong>{s.a.leads}</strong></td>
                                        <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-300">{s.b.won} → <strong>{s.a.won}</strong></td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="text-gray-600 dark:text-gray-300 mr-1">{s.b.conversionRate.toFixed(0)}%→{s.a.conversionRate.toFixed(0)}%</span>
                                            <DeltaBadge value={s.deltaConversion} suffix=" pp" />
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="font-bold text-gray-900 dark:text-white">{formatBRL(s.a.revenue)}</div>
                                            <div className="text-[11px] text-gray-400">de {formatBRL(s.b.revenue)}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insights & Recomendações */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-500" /> Insights & Recomendações</h3>
                    <button onClick={handleAi} disabled={aiLoading || loading || !data}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-blue-500 text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                        {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Analisar com IA
                    </button>
                </div>

                {loading ? (
                    <div className="text-gray-400 text-sm">Calculando…</div>
                ) : (
                    <ul className="space-y-2">
                        {(data?.insights || []).length === 0 && <li className="text-sm text-gray-400">Sem insights para este período.</li>}
                        {data?.insights.map((ins, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ins.severity === 'positive' ? 'bg-emerald-500' : ins.severity === 'negative' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                                <span className="text-gray-700 dark:text-gray-300">{ins.text}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {aiError && <p className="mt-4 text-sm text-amber-600">{aiError}</p>}
                {aiSummary && (
                    <div className="mt-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                        <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1"><Sparkles size={12} /> Resumo da IA</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiSummary}</div>
                    </div>
                )}
            </div>

            {selectedVideo && (
                <SalesDetailsModal
                    videoId={selectedVideo.id}
                    videoTitle={selectedVideo.title}
                    period="all"
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
};

const MoverList: React.FC<{ title: string; icon: any; iconColor: string; items: any[]; onSelect: (v: { id: string; title: string }) => void; loading: boolean; emptyMsg: string }>
    = ({ title, icon: Icon, iconColor, items, onSelect, loading, emptyMsg }) => (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Icon className={`w-5 h-5 ${iconColor}`} /> {title}</h3>
            </div>
            <div className="p-3 divide-y divide-gray-100 dark:divide-gray-700/60">
                {loading ? (
                    <div className="p-6 text-center text-gray-400"><Loader2 className="animate-spin inline" /></div>
                ) : items.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">{emptyMsg}</div>
                ) : items.map(v => (
                    <button key={v.videoId} onClick={() => onSelect({ id: v.videoId, title: v.videoTitle })} className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                        <div className="w-16 h-10 rounded overflow-hidden bg-gray-200 shrink-0">
                            {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400">No IMG</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{v.videoTitle}</h4>
                            <div className="text-[11px] text-gray-400">
                                {v.b.leads} → {v.a.leads} leads · último lead {fmtDate(v.lastLeadDate)}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <DeltaBadge value={v.deltaLeadsPct} />
                            <div className={`text-[11px] mt-0.5 ${v.deltaRevenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{v.deltaRevenue >= 0 ? '+' : ''}{formatBRL(v.deltaRevenue)}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

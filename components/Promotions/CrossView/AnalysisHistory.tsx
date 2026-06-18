import React, { useEffect, useState, useCallback } from 'react';
import {
  listAnalyses,
  getAnalysisById,
  deleteAnalysis,
  updateAnalysisMeta,
  CvAnalysisListItem,
  CvAnalysis,
  CvVideoMeta,
} from '../../../services/crossViewService';
import { AnalysisView } from './AnalysisView';
import { History, Loader2, Star, Trash2, ChevronLeft, FileText, Sparkles } from 'lucide-react';

const brl = (n?: number | null) => (n == null ? '—' : 'US$ ' + n.toFixed(4));

export const AnalysisHistory: React.FC = () => {
  const [items, setItems] = useState<CvAnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<number | null>(null);
  const [open, setOpen] = useState<{ analysis: CvAnalysis; videos: CvVideoMeta[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await listAnalyses(50));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openOne = async (id: number) => {
    setOpening(id);
    const data = await getAnalysisById(id);
    if (data) setOpen({ analysis: { ...data.analysis, cached: true }, videos: data.videos });
    setOpening(null);
  };

  const toggleFav = async (e: React.MouseEvent, it: CvAnalysisListItem) => {
    e.stopPropagation();
    const fav = !it.favorite;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, favorite: fav } : x)));
    await updateAnalysisMeta(it.id, { favorite: fav });
  };

  const remove = async (e: React.MouseEvent, it: CvAnalysisListItem) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta análise do histórico?')) return;
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    await deleteAnalysis(it.id);
  };

  if (open) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setOpen(null);
            load();
          }}
          className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ChevronLeft size={16} /> Voltar ao histórico
        </button>
        <AnalysisView analysis={open.analysis} videos={open.videos} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <History size={20} className="text-blue-600" /> Histórico de análises
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Nenhuma análise salva ainda. Gere uma na aba "Nova análise".</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              onClick={() => openOne(it.id)}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
            >
              <button onClick={(e) => toggleFav(e, it)} title="Favoritar" className="shrink-0">
                <Star size={18} className={it.favorite ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-500'} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {it.title || `${it.videoCount} vídeo(s) · ${it.model}`}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(it.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{it.videoCount} vídeo(s) · {it.model} · {brl(it.cost_usd)}
                </p>
              </div>
              {it.hasBrief && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                  <Sparkles size={11} /> brief
                </span>
              )}
              {opening === it.id ? (
                <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />
              ) : (
                <FileText size={16} className="text-gray-300 dark:text-gray-500 shrink-0" />
              )}
              <button onClick={(e) => remove(e, it)} title="Excluir" className="shrink-0 text-gray-300 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

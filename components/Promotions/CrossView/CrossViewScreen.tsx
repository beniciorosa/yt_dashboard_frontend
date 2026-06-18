import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { VideoMultiSelect, VideoLite } from './VideoMultiSelect';
import { AnalysisView } from './AnalysisView';
import { AnalysisHistory } from './AnalysisHistory';
import {
  fetchCvModels,
  estimateCv,
  cvStatus,
  extractCvOne,
  analyzeCv,
  CvModel,
  CvEstimate,
  CvStatusItem,
  CvAnalysis,
} from '../../../services/crossViewService';
import { Sparkles, DollarSign, Clock, Loader2, Cpu, Wand2, CheckCircle2, AlertTriangle, FileText, History, LayoutGrid } from 'lucide-react';

const USD_TO_BRL = 5.4; // aproximado, só para exibição

const fmtTime = (sec: number) => {
  if (!sec) return '—';
  if (sec < 60) return `~${sec}s`;
  return `~${Math.round(sec / 60)} min`;
};

export const CrossViewScreen: React.FC = () => {
  const [selected, setSelected] = useState<VideoLite[]>([]);
  const [models, setModels] = useState<CvModel[]>([]);
  const [model, setModel] = useState<string>('');

  const [estimate, setEstimate] = useState<CvEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  const [statusMap, setStatusMap] = useState<Record<string, CvStatusItem>>({});

  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string }>({ done: 0, total: 0, current: '' });

  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'new' | 'history'>('new');

  const selectedIds = useMemo(() => selected.map((v) => v.video_id), [selected]);
  const idsKey = useMemo(() => [...selectedIds].sort().join(','), [selectedIds]);

  // carrega modelos
  useEffect(() => {
    (async () => {
      const res = await fetchCvModels();
      if (res) {
        setModels(res.models);
        setModel(res.default);
      }
    })();
  }, []);

  // estimativa + status (recalcula a cada mudança de seleção/modelo)
  const debounceRef = useRef<any>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selectedIds.length === 0 || !model) {
      setEstimate(null);
      setStatusMap({});
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setEstimating(true);
      const [est, st] = await Promise.all([estimateCv(selectedIds, model), cvStatus(selectedIds)]);
      setEstimate(est);
      const map: Record<string, CvStatusItem> = {};
      st.forEach((s) => (map[s.videoId] = s));
      setStatusMap(map);
      setEstimating(false);
    }, 450);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, model]);

  // reseta análise quando muda a seleção/modelo
  useEffect(() => {
    setAnalysis(null);
    setError(null);
  }, [idsKey, model]);

  const pending = useMemo(() => selected.filter((v) => !statusMap[v.video_id]?.cached), [selected, statusMap]);
  const allReady = selected.length > 0 && pending.length === 0;

  const handleExtract = useCallback(async () => {
    const toDo = pending.length > 0 ? pending : selected;
    if (toDo.length === 0) return;
    setExtracting(true);
    setError(null);
    setProgress({ done: 0, total: toDo.length, current: '' });
    const newMap = { ...statusMap };
    for (let i = 0; i < toDo.length; i++) {
      const v = toDo[i];
      setProgress({ done: i, total: toDo.length, current: v.title || v.video_id });
      const r = await extractCvOne(v.video_id);
      if (r && r.ok) {
        newMap[v.video_id] = {
          videoId: v.video_id,
          cached: true,
          hasTranscript: !!r.hasTranscript,
          transcriptSource: r.transcriptSource || null,
        };
        setStatusMap({ ...newMap });
      } else {
        setError(`Falha ao extrair "${v.title || v.video_id}": ${r?.error || 'erro desconhecido'}`);
      }
    }
    setProgress({ done: toDo.length, total: toDo.length, current: '' });
    setExtracting(false);
  }, [pending, selected, statusMap]);

  const handleAnalyze = useCallback(async () => {
    if (!allReady) return;
    setAnalyzing(true);
    setError(null);
    const res = await analyzeCv(selectedIds, model);
    if (res) setAnalysis(res);
    else setError('Falha ao gerar a análise. Tente novamente ou troque o modelo.');
    setAnalyzing(false);
  }, [allReady, selectedIds, model, selected]);

  const selectedModelInfo = models.find((m) => m.id === model);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="text-blue-600" /> Cross-View
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Selecione vídeos para cruzar conteúdo (transcrição, título, descrição, thumbnail) com as vendas reais e
          descobrir o que faz uns converterem mais que outros — e qual público cada um atrai.
        </p>
      </div>

      {/* Sub-navegação: Nova análise | Histórico */}
      <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => setMode('new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'new' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <LayoutGrid size={16} /> Nova análise
        </button>
        <button
          onClick={() => setMode('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'history' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <History size={16} /> Histórico
        </button>
      </div>

      {mode === 'history' ? (
        <AnalysisHistory />
      ) : (
      <>
      <div className="grid lg:grid-cols-2 gap-6">
        <VideoMultiSelect selected={selected} onChange={setSelected} />

        {/* Painel de configuração + estimativa */}
        <div className="space-y-6">
          {/* Modelo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <label className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-2">
              <Cpu size={18} className="text-indigo-500" /> Modelo de IA
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.isDefault ? ' — padrão' : ''}
                </option>
              ))}
            </select>
            {selectedModelInfo?.note && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {selectedModelInfo.note}
              </p>
            )}
          </div>

          {/* Estimativa */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-500" /> Estimativa
              </h3>
              {estimating && <Loader2 className="animate-spin text-gray-400" size={16} />}
            </div>
            {!estimate || !estimate.cost ? (
              <p className="text-sm text-gray-500">Selecione vídeos para ver a estimativa de custo e tempo.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Custo estimado (teto)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">US$ {estimate.cost.totalMax.toFixed(3)}</p>
                    <p className="text-[11px] text-gray-400">~ R$ {(estimate.cost.totalMax * USD_TO_BRL).toFixed(2)} (câmbio aprox.)</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> Tempo estimado</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtTime(estimate.timeSecondsEstimate)}</p>
                    <p className="text-[11px] text-gray-400">{estimate.videosUncached} a extrair / {estimate.videosTotal}</p>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 space-y-0.5">
                  <p>Extração (legenda/Whisper + leitura): US$ {(estimate.cost.whisperMax + estimate.cost.extraction).toFixed(3)}</p>
                  <p>Análise ({model}): US$ {estimate.cost.analysis.toFixed(3)}</p>
                  <p className="text-gray-400 italic">{estimate.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Passo 1: extração */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-3">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" /> 1) Extrair conteúdo
            </h3>
            {selected.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selected.map((v) => {
                  const st = statusMap[v.video_id];
                  return (
                    <div key={v.video_id} className="flex items-center gap-2 text-xs">
                      {st?.cached ? (
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-500 shrink-0" />
                      )}
                      <span className="truncate text-gray-700 dark:text-gray-300 flex-1">{v.title || v.video_id}</span>
                      {st?.cached && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.hasTranscript ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'}`}>
                          {st.transcriptSource === 'captions' ? 'legenda' : st.transcriptSource === 'whisper' ? 'whisper' : st.transcriptSource === 'manual' ? 'manual' : 'sem transcrição'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {extracting && (
              <div className="text-xs text-gray-500">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="animate-spin" size={14} /> Extraindo {progress.done}/{progress.total}…
                </div>
                <p className="truncate">{progress.current}</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}
            <button
              onClick={handleExtract}
              disabled={extracting || selected.length === 0}
              className="w-full px-4 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending.length > 0 ? `Extrair ${pending.length} vídeo(s) pendente(s)` : 'Reextrair conteúdo'}
            </button>
          </div>

          {/* Passo 2: análise */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-3">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Wand2 size={18} className="text-emerald-500" /> 2) Gerar análise
            </h3>
            {!allReady && selected.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Extraia o conteúdo de todos os vídeos selecionados antes de analisar.</p>
            )}
            <button
              onClick={handleAnalyze}
              disabled={!allReady || analyzing}
              className="w-full px-4 py-2.5 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Analisando…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Analisar {selected.length} vídeo(s)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {analysis && <AnalysisView analysis={analysis} videos={selected} model={model} />}
      </>
      )}
    </div>
  );
};

import React from 'react';
import { CvAnalysis, CvPerVideo } from '../../../services/crossViewService';
import { VideoLite } from './VideoMultiSelect';
import { Users, TrendingUp, Lightbulb, Target, AlertTriangle, Tag } from 'lucide-react';

const brl = (n?: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tierColor = (tier?: string) => {
  const t = (tier || '').toLowerCase();
  if (t.includes('avanç') || t.includes('avanc') || t.includes('advanced')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  if (t.includes('inter')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (t.includes('inici') || t.includes('begin')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
};

interface Props {
  analysis: CvAnalysis;
  videos: VideoLite[];
}

export const AnalysisResults: React.FC<Props> = ({ analysis, videos }) => {
  const result = analysis.result;
  const titleOf = (vid: string) => videos.find((v) => v.video_id === vid)?.title || vid;
  const thumbOf = (vid: string) => videos.find((v) => v.video_id === vid)?.thumbnail_url || '';

  if (!result || result._parseError) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-2">
          <AlertTriangle size={18} /> A IA não retornou um JSON válido
        </div>
        <pre className="text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-300 max-h-80 overflow-auto">
          {result?.raw || 'Sem conteúdo. Tente novamente ou troque o modelo.'}
        </pre>
      </div>
    );
  }

  const perVideo = result.perVideo || [];
  const ci = result.crossInsights || {};

  return (
    <div className="space-y-6">
      {/* Meta da execução */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">Modelo: <b className="text-gray-700 dark:text-gray-200">{analysis.model}</b></span>
        {analysis.cost_usd != null && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">Custo real: <b className="text-gray-700 dark:text-gray-200">US$ {analysis.cost_usd.toFixed(4)}</b></span>}
        {analysis.input_tokens != null && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">Tokens: {analysis.input_tokens}↑ / {analysis.output_tokens}↓</span>}
        {analysis.cached && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">⚡ do cache</span>}
      </div>

      {/* Insights cruzados */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={20} /> O que separa os que mais converteram
        </h2>

        {ci.fatoresDeConversao && ci.fatoresDeConversao.length > 0 && (
          <div className="space-y-3">
            {ci.fatoresDeConversao.map((f, i) => (
              <div key={i} className="border-l-2 border-emerald-400 pl-3">
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{f.fator}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{f.explicacao}</p>
                {f.evidencia && <p className="text-xs text-gray-400 mt-0.5 italic">Evidência: {f.evidencia}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {ci.padroesDeTitulo && (
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Padrões de Título</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{ci.padroesDeTitulo}</p>
            </div>
          )}
          {ci.padroesDeThumbnail && (
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Padrões de Thumbnail</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{ci.padroesDeThumbnail}</p>
            </div>
          )}
          {ci.padroesDeConteudo && (
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Padrões de Conteúdo</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{ci.padroesDeConteudo}</p>
            </div>
          )}
        </div>

        {ci.audienceSegmentMap && ci.audienceSegmentMap.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
              <Users size={16} className="text-blue-500" /> Mapa de público
            </p>
            <div className="space-y-2">
              {ci.audienceSegmentMap.map((seg, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColor(seg.segmento)}`}>{seg.segmento}</span>
                  <span className="text-gray-500">{(seg.videoIds || []).map((id) => titleOf(id)).join(' · ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ci.productAffinity && ci.productAffinity.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
              <Tag size={16} className="text-indigo-500" /> Afinidade conteúdo × produto
            </p>
            <div className="space-y-1">
              {ci.productAffinity.map((p, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-300">
                  <b className="text-gray-800 dark:text-gray-100">{p.produto}</b> — {p.tipoDeConteudo}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recomendações */}
      {ci.recommendations && ci.recommendations.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-3">
            <Lightbulb size={20} /> Recomendações para os próximos vídeos
          </h2>
          <ul className="space-y-2">
            {ci.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="text-emerald-500 font-bold">{i + 1}.</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Por vídeo */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Target className="text-blue-500" size={20} /> Análise por vídeo
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {perVideo.map((v: CvPerVideo) => (
            <div key={v.videoId} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-20 h-12 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 shrink-0">
                  {thumbOf(v.videoId) ? <img src={thumbOf(v.videoId)} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{titleOf(v.videoId)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {v.audienceProfile?.tier && (
                  <span className={`px-2 py-0.5 rounded font-medium ${tierColor(v.audienceProfile.tier)}`}>
                    🎯 {v.audienceProfile.tier}
                  </span>
                )}
                <span className="text-gray-500">Leads: <b className="text-gray-700 dark:text-gray-200">{v.leads ?? 0}</b></span>
                <span className="text-gray-500">Vendas: <b className="text-emerald-600 dark:text-emerald-400">{v.won ?? 0}</b></span>
                <span className="text-gray-500">Ticket: <b className="text-gray-700 dark:text-gray-200">{brl(v.ticketMedio)}</b></span>
                <span className="text-gray-500">Receita: <b className="text-gray-700 dark:text-gray-200">{brl(v.revenue)}</b></span>
              </div>

              {v.audienceProfile?.justificativa && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">{v.audienceProfile.justificativa}</p>
              )}

              {v.conversionDrivers && (
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
                  {v.conversionDrivers.hook && <p><b>Hook:</b> {v.conversionDrivers.hook}</p>}
                  {v.conversionDrivers.titulo && <p><b>Título:</b> {v.conversionDrivers.titulo}</p>}
                  {v.conversionDrivers.thumbnail && <p><b>Thumbnail:</b> {v.conversionDrivers.thumbnail}</p>}
                  {v.conversionDrivers.profundidade && <p><b>Profundidade:</b> {v.conversionDrivers.profundidade}</p>}
                  {v.conversionDrivers.cta && <p><b>CTA:</b> {v.conversionDrivers.cta}</p>}
                </div>
              )}

              {v.porqueConverteuOuNao && (
                <p className="text-sm text-gray-700 dark:text-gray-200">{v.porqueConverteuOuNao}</p>
              )}

              {v.productMix && v.productMix.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {v.productMix.slice(0, 6).map((p, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                      {p.name}{p.count > 1 ? ` ×${p.count}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

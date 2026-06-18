import React, { useState } from 'react';
import { AnalysisResults } from './AnalysisResults';
import {
  CvAnalysis,
  analyzeCv,
  generateBrief,
  updateAnalysisMeta,
} from '../../../services/crossViewService';
import {
  Star,
  RefreshCw,
  Copy,
  Download,
  Printer,
  Wand2,
  Loader2,
  Check,
  Lightbulb,
} from 'lucide-react';

type VideoMeta = { video_id: string; title: string; thumbnail_url: string };

interface Props {
  analysis: CvAnalysis;
  videos: VideoMeta[];
  model?: string;
}

const brl = (n?: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildMarkdown(a: CvAnalysis, videos: VideoMeta[]): string {
  const r = a.result || {};
  const titleOf = (id: string) => videos.find((v) => v.video_id === id)?.title || id;
  let md = `# Cross-View — ${a.title || 'Análise'}\n\n`;
  md += `Modelo: ${a.model} · Vídeos: ${(a.video_ids || []).length}`;
  if (a.cost_usd != null) md += ` · Custo: US$ ${a.cost_usd}`;
  if (a.created_at) md += ` · ${new Date(a.created_at).toLocaleString('pt-BR')}`;
  md += `\n\n`;

  const ci = r.crossInsights || {};
  if (ci.fatoresDeConversao?.length) {
    md += `## Fatores de conversão\n`;
    ci.fatoresDeConversao.forEach((f) => (md += `- **${f.fator}** — ${f.explicacao}${f.evidencia ? ` (Evidência: ${f.evidencia})` : ''}\n`));
    md += `\n`;
  }
  if (ci.padroesDeTitulo) md += `**Padrões de título:** ${ci.padroesDeTitulo}\n\n`;
  if (ci.padroesDeThumbnail) md += `**Padrões de thumbnail:** ${ci.padroesDeThumbnail}\n\n`;
  if (ci.padroesDeConteudo) md += `**Padrões de conteúdo:** ${ci.padroesDeConteudo}\n\n`;
  if (ci.recommendations?.length) {
    md += `## Recomendações\n`;
    ci.recommendations.forEach((x, i) => (md += `${i + 1}. ${x}\n`));
    md += `\n`;
  }
  if (r.perVideo?.length) {
    md += `## Por vídeo\n`;
    r.perVideo.forEach((v) => {
      md += `### ${titleOf(v.videoId)}\n`;
      md += `- Público: ${v.audienceProfile?.tier || '?'} — ${v.audienceProfile?.justificativa || ''}\n`;
      md += `- Leads: ${v.leads ?? 0} · Vendas: ${v.won ?? 0} · Ticket: ${brl(v.ticketMedio)} · Receita: ${brl(v.revenue)}\n`;
      if (v.porqueConverteuOuNao) md += `- ${v.porqueConverteuOuNao}\n`;
      md += `\n`;
    });
  }
  const b = a.brief;
  if (b) {
    md += `## Brief do próximo vídeo\n`;
    if (b.titulos?.length) {
      md += `**Títulos:**\n`;
      b.titulos.forEach((t) => (md += `- ${t}\n`));
    }
    if (b.hook) md += `**Hook:** ${b.hook}\n`;
    if (b.thumbnail) md += `**Thumbnail:** ${b.thumbnail.conceito || ''}${b.thumbnail.texto ? ` (texto: ${b.thumbnail.texto})` : ''}\n`;
    if (b.roteiro?.length) {
      md += `**Roteiro:**\n`;
      b.roteiro.forEach((s) => (md += `- ${s.secao}: ${s.objetivo}\n`));
    }
    if (b.cta) md += `**CTA:** ${b.cta}\n`;
  }
  return md;
}

export const AnalysisView: React.FC<Props> = ({ analysis, videos, model }) => {
  const [cur, setCur] = useState<CvAnalysis>(analysis);
  const [titleDraft, setTitleDraft] = useState(analysis.title || '');
  const [refreshing, setRefreshing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [copied, setCopied] = useState(false);

  const effModel = model || cur.model || 'gpt-4o';

  const saveTitle = async () => {
    if ((cur.title || '') === titleDraft) return;
    setCur({ ...cur, title: titleDraft });
    if (cur.id) await updateAnalysisMeta(cur.id, { title: titleDraft });
  };

  const toggleFavorite = async () => {
    const fav = !cur.favorite;
    setCur({ ...cur, favorite: fav });
    if (cur.id) await updateAnalysisMeta(cur.id, { favorite: fav });
  };

  const refresh = async () => {
    if (!cur.video_ids?.length) return;
    setRefreshing(true);
    const a = await analyzeCv(cur.video_ids, effModel, true);
    if (a) {
      setCur(a);
      setTitleDraft(a.title || '');
    }
    setRefreshing(false);
  };

  const makeBrief = async () => {
    if (!cur.id) return;
    setBriefing(true);
    const b = await generateBrief(cur.id, effModel);
    if (b) setCur({ ...cur, brief: b.brief, brief_model: b.brief_model });
    setBriefing(false);
  };

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown(cur, videos));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadMd = () => {
    const blob = new Blob([buildMarkdown(cur, videos)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross-view-${cur.id || 'analise'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printMd = () => {
    const md = buildMarkdown(cur, videos);
    const w = window.open('', '_blank');
    if (!w) return;
    const safe = md.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    w.document.write(
      `<html><head><title>Cross-View</title><style>body{font-family:system-ui,Segoe UI,Arial;padding:32px;white-space:pre-wrap;line-height:1.55;color:#111;font-size:14px}</style></head><body>${safe}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const brief = cur.brief;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={toggleFavorite} title="Favoritar" className="shrink-0">
            <Star size={20} className={cur.favorite ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-500'} />
          </button>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            placeholder="Dê um nome a esta análise…"
            className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none text-gray-900 dark:text-white font-semibold text-sm py-1"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            title="Reanalisar com as vendas atuais (ignora o cache)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar (vendas novas)
          </button>
          <button onClick={copyMd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button onClick={downloadMd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100">
            <Download size={14} /> .md
          </button>
          <button onClick={printMd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100">
            <Printer size={14} /> PDF
          </button>
          <button
            onClick={makeBrief}
            disabled={briefing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {briefing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} {brief ? 'Regerar brief' : 'Brief do próximo vídeo'}
          </button>
        </div>
      </div>

      <AnalysisResults analysis={cur} videos={videos as any} />

      {/* Brief */}
      {brief && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="text-amber-500" size={20} /> Brief do próximo vídeo
            {cur.brief_model && <span className="text-[10px] font-normal text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{cur.brief_model}</span>}
          </h2>

          {brief._parseError ? (
            <pre className="text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-300 max-h-72 overflow-auto">{brief.raw}</pre>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {brief.titulos?.length ? (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Títulos sugeridos</p>
                  <ul className="space-y-1">
                    {brief.titulos.map((t, i) => (
                      <li key={i} className="text-gray-800 dark:text-gray-100">• {t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {brief.thumbnail && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Thumbnail</p>
                  <p className="text-gray-700 dark:text-gray-300">{brief.thumbnail.conceito}</p>
                  {brief.thumbnail.texto && <p className="text-gray-500 mt-1">Texto: <b>{brief.thumbnail.texto}</b></p>}
                  {brief.thumbnail.elementos?.length ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {brief.thumbnail.elementos.map((e, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{e}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {brief.hook && (
                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Hook</p>
                  <p className="text-gray-700 dark:text-gray-300">{brief.hook}</p>
                </div>
              )}
              {brief.roteiro?.length ? (
                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Roteiro</p>
                  <div className="space-y-2">
                    {brief.roteiro.map((s, i) => (
                      <div key={i} className="border-l-2 border-emerald-400 pl-3">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{s.secao}</p>
                        {s.objetivo && <p className="text-gray-600 dark:text-gray-400 text-xs">{s.objetivo}</p>}
                        {s.pontos?.length ? (
                          <ul className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 list-disc list-inside">
                            {s.pontos.map((p, j) => (
                              <li key={j}>{p}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {brief.cta && (
                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">CTA</p>
                  <p className="text-gray-700 dark:text-gray-300">{brief.cta}</p>
                </div>
              )}
              {brief.publico_alvo && (
                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Público-alvo</p>
                  <p className="text-gray-700 dark:text-gray-300">{brief.publico_alvo}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

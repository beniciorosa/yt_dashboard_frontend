import { API_BASE_URL } from './salesMetricsService';

export interface CvModel {
  id: string;
  label: string;
  inputPer1k: number;
  outputPer1k: number;
  vision: boolean;
  available: boolean;
  isDefault: boolean;
  note?: string;
}

export interface CvModelsResponse {
  models: CvModel[];
  default: string;
}

export interface CvEstimate {
  model: string;
  videosTotal: number;
  videosUncached: number;
  cost: {
    currency: string;
    whisperMax: number;
    extraction: number;
    analysis: number;
    totalMax: number;
  } | null;
  timeSecondsEstimate: number;
  notes: string;
}

export interface CvStatusItem {
  videoId: string;
  cached: boolean;
  hasTranscript: boolean;
  transcriptSource: string | null;
}

export interface CvExtractItem {
  videoId: string;
  ok: boolean;
  status: 'ready' | 'failed';
  transcriptSource?: string;
  hasTranscript?: boolean;
  cached?: boolean;
  error?: string;
}

export interface CvPerVideo {
  videoId: string;
  audienceProfile?: { tier?: string; justificativa?: string };
  ticketMedio?: number;
  leads?: number;
  won?: number;
  revenue?: number;
  productMix?: { name: string; count: number }[];
  conversionDrivers?: { hook?: string; titulo?: string; thumbnail?: string; profundidade?: string; cta?: string };
  porqueConverteuOuNao?: string;
}

export interface CvCrossInsights {
  fatoresDeConversao?: { fator: string; explicacao: string; evidencia: string }[];
  padroesDeTitulo?: string;
  padroesDeThumbnail?: string;
  padroesDeConteudo?: string;
  audienceSegmentMap?: { segmento: string; videoIds: string[] }[];
  productAffinity?: { produto: string; tipoDeConteudo: string }[];
  recommendations?: string[];
}

export interface CvResult {
  perVideo?: CvPerVideo[];
  crossInsights?: CvCrossInsights;
  _parseError?: boolean;
  raw?: string;
}

export interface CvAnalysis {
  cached: boolean;
  set_hash?: string;
  video_ids?: string[];
  model?: string;
  result?: CvResult;
  sales_snapshot?: any[];
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_usd?: number | null;
  created_at?: string;
}

export const fetchCvModels = async (): Promise<CvModelsResponse | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cross-view/models`);
    if (!res.ok) throw new Error('Falha ao carregar modelos');
    return await res.json();
  } catch (e) {
    console.error('fetchCvModels', e);
    return null;
  }
};

export const estimateCv = async (videoIds: string[], model: string): Promise<CvEstimate | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cross-view/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds, model }),
    });
    if (!res.ok) throw new Error('Falha na estimativa');
    return await res.json();
  } catch (e) {
    console.error('estimateCv', e);
    return null;
  }
};

export const cvStatus = async (videoIds: string[]): Promise<CvStatusItem[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cross-view/status?videoIds=${encodeURIComponent(videoIds.join(','))}`);
    if (!res.ok) throw new Error('Falha no status');
    const json = await res.json();
    return json.items || [];
  } catch (e) {
    console.error('cvStatus', e);
    return [];
  }
};

/** Extrai 1 vídeo por vez (respeita o limite de 60s da Vercel). */
export const extractCvOne = async (videoId: string, force = false): Promise<CvExtractItem | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cross-view/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds: [videoId], force }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Falha na extração');
    }
    const json = await res.json();
    return (json.items && json.items[0]) || null;
  } catch (e: any) {
    console.error('extractCvOne', e);
    return { videoId, ok: false, status: 'failed', error: e?.message || 'erro' };
  }
};

export const setManualTranscript = async (videoId: string, transcript: string): Promise<CvExtractItem | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cross-view/manual-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, transcript }),
    });
    if (!res.ok) throw new Error('Falha ao salvar transcrição');
    return await res.json();
  } catch (e) {
    console.error('setManualTranscript', e);
    return null;
  }
};

export const analyzeCv = async (videoIds: string[], model: string): Promise<CvAnalysis | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cross-view/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds, model }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Falha na análise');
    }
    return await res.json();
  } catch (e) {
    console.error('analyzeCv', e);
    return null;
  }
};

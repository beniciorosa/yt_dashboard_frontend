// --- START OF FILE services/geminiService.ts ---
import { GoogleGenAI } from "@google/genai";
import { Competitor } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY || 'YOUR_GEMINI_KEY_HERE'; 
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeCompetitorGrowth = async (competitor: Competitor): Promise<string> => {
  const client = getClient();
  if (!client) return "Erro: Chave de API não configurada.";

  const snapshotText = competitor.snapshots.map(s => 
    `Data: ${new Date(s.date).toLocaleDateString()}, Inscritos: ${s.subscribers}, Views: ${s.views}, Vídeos: ${s.videos}`
  ).join('\n');

  const prompt = `
    Atue como um estrategista de conteúdo sênior do YouTube. Analise os dados de crescimento do canal abaixo.
    Canal: ${competitor.channelName}
    Influenciador: ${competitor.influencerName}
    País: ${competitor.country}
    Data de Início no YT: ${new Date(competitor.youtubeJoinDate).toLocaleDateString()}
    
    Histórico de Registros:
    ${snapshotText}
    
    Forneça uma análise concisa (máximo 2 parágrafos) cobrindo:
    1. A taxa de crescimento atual.
    2. Uma recomendação estratégica.
    Responda em Português do Brasil.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com a IA.";
  }
};

interface DescriptionParams {
  title: string;
  keywords: string;
  cta: string;
}

export const generateVideoDescription = async (params: DescriptionParams): Promise<string> => {
  const client = getClient();
  if (!client) return "Erro: Chave de API não configurada.";

  const { title, keywords, cta } = params;

  const prompt = `
    Atue como um Especialista em SEO para YouTube. 
    Sua tarefa é escrever uma descrição de vídeo altamente otimizada.

    DADOS DO VÍDEO:
    - Título: "${title}"
    - Palavras-chave: ${keywords}
    - Call to Action (CTA): ${cta}

    ESTRUTURA DA RESPOSTA:
    1. GANCHO (HOOK): 2 frases poderosas.
    2. SOBRE O VÍDEO: Resumo do conteúdo.
    3. TÓPICOS: Lista de pontos chave.
    4. CTA: O Call to Action solicitado.
    5. HASHTAGS: 3 a 5 hashtags relevantes.

    Responda em Português do Brasil.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao gerar descrição com IA.";
  }
};
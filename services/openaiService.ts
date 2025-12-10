import OpenAI from 'openai';

// ==================================================================================
// ⚠️ LOCAL ONDE VOCÊ DEVE COLOCAR SUA API KEY DA OPENAI ⚠️
// Substitua 'SUA_CHAVE_OPENAI_AQUI' pela sua chave que começa com sk-...
// ==================================================================================
const API_KEY = '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';

// Inicializa o cliente OpenAI para o chat (GPT-4o)
const openai = new OpenAI({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true
});

export interface GeneratedContent {
    intro: string;
    chapters: string[];
    hashtags: string;
}

/**
 * Passo 1: Transcreve o áudio usando o modelo Whisper-1.
 * 
 * ATENÇÃO: Usamos 'fetch' nativo aqui em vez do SDK da OpenAI.
 * Motivo: O SDK oficial frequentemente causa erros de "400 Bad Request / Parsing Body"
 * ao enviar arquivos (File/Blob) diretamente do navegador devido a problemas 
 * com limites de boundary no multipart/form-data.
 */
export const transcribeAudioOpenAI = async (file: File): Promise<string> => {
    try {
        if (!API_KEY || API_KEY.includes('SUA_CHAVE')) {
            throw new Error("Você precisa configurar a API KEY no arquivo services/openaiService.ts");
        }

        console.log("Iniciando transcrição via OpenAI Whisper (Fetch Nativo)...");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt'); // Força português

        // MUDANÇA IMPORTANTE:
        // 'srt' retorna o formato de legenda (SubRip) que contém a minutagem (timestamps).
        // Exemplo de saída:
        // 1
        // 00:00:00,000 --> 00:00:04,000
        // Olá, bem-vindos a este vídeo.
        formData.append('response_format', 'srt');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                // Nota: Não defina 'Content-Type': 'multipart/form-data' aqui manualmente.
                // O navegador define isso automaticamente com o boundary correto ao usar FormData.
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro OpenAI (${response.status}): ${errorText}`);
        }

        const transcriptionText = await response.text();
        return transcriptionText;

    } catch (error: any) {
        console.error("Erro na transcrição OpenAI:", error);
        throw new Error(error.message || "Erro ao transcrever áudio com OpenAI.");
    }
};

/**
 * Helper para extrair a última minutagem do SRT para evitar alucinações de tempo.
 */
const getLastTimestamp = (srtText: string): string => {
    try {
        // Procura por padrões de tempo SRT: 00:00:00,000 --> 00:15:23,000
        const timeRegex = /(\d{2}:\d{2}:\d{2})/g;
        const matches = srtText.match(timeRegex);

        if (matches && matches.length > 0) {
            return matches[matches.length - 1]; // Retorna o último tempo encontrado
        }
    } catch (e) {
        console.warn("Não foi possível extrair a duração total do SRT.");
    }
    return "Desconhecido";
};

/**
 * Helper para converter MM:SS em segundos totais para comparações
 */
const timeToSeconds = (timeStr: string): number => {
    try {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
    } catch (e) {
        return -1;
    }
    return -1;
};

/**
 * Passo 2: Gera a descrição baseada no TEXTO transcrito usando GPT-4o.
 * Não enviamos mais áudio aqui, apenas o texto, o que é mais barato e eficiente.
 */
export const generateDescriptionOpenAI = async (
    transcriptionText: string,
    videoTitle: string
): Promise<GeneratedContent> => {
    try {
        // 1. Descobrir duração aproximada para injetar no prompt
        const lastTime = getLastTimestamp(transcriptionText);

        const prompt = `
      Você é um especialista em SEO para YouTube e Copywriting.
      Sua tarefa é analisar a TRANSCRIÇÃO (em formato SRT/Legenda com timestamps) fornecida e criar componentes de texto para uma descrição de vídeo de alta performance.
      
      O Título do vídeo é: "${videoTitle}"
      DURAÇÃO ESTIMADA DO VÍDEO (Baseado no SRT): ${lastTime}

      Gere uma saída JSON com exatamente 3 campos: "intro", "chapters", "hashtags".
      
      Regras para "intro":
      1. Escreva entre 2 a 3 parágrafos curtos e envolventes resumindo o conteúdo do vídeo, sempre divididos pelo espaçamento de uma linha entre eles.
      2. OBRIGATÓRIO: O primeiro parágrafo deve incluir as palavras-chave principais contidas no título do vídeo de forma natural nas primeiras 150 caracteres.
      3. Use tom persuasivo e em primeira pessoa ("Você vai entender", "Eu explico", "Vou te mostrar"), e o texto próximo da linguagem utilizada no vídeo, com menos formalidade.
      4. Não use saudações como "Olá pessoal". Vá direto ao ponto.
      
      Regras CRÍTICAS para "chapters" (EVITE ALUCINAÇÕES DE TEMPO E FORMATO):
      1. O SRT está no formato "HH:MM:SS,ms". VOCÊ DEVE CONVERTER PARA "MM:SS".
         Exemplo: Se o timestamp for "00:05:32,400", seu capítulo DEVE ser "05:32". 
         NÃO inclua a hora "00:" inicial.
      2. ANALISE O SRT REAL. O vídeo termina em ${lastTime}. NENHUM capítulo pode ter um horário superior a ${lastTime}.
      3. ESPAÇAMENTO OBRIGATÓRIO:
         - O primeiro capítulo deve ser "00:00 – Introdução".
         - O segundo capítulo NÃO PODE SER "00:01", "00:05" ou qualquer tempo imediatamente colado.
         - O segundo capítulo deve ter pelo menos 20 segundos de diferença do primeiro (Ex: 00:30 em diante).
         - Mantenha um intervalo saudável entre os tópicos. Não gere capítulos a cada 1 minuto se o assunto for o mesmo.
      4. QUANTIDADE:
         - Se o vídeo for curto (menos de 10 min), gere no máximo 4 ou 5 capítulos.
      5. O formato da string deve ser EXATAMENTE: "MM:SS – Título do Tópico".
      
      Regras para "hashtags":
      1. Gere exatamente 3 hashtags altamente relevantes.
      2. Formato: "#tag1 #tag2 #tag3".
      3. Separe por espaços. NÃO use vírgulas. Utilize Acentos se existir.

      Responda APENAS o JSON.
      
      TRANSCRIÇÃO SRT:
      ${transcriptionText.substring(0, 100000)} 
    `;

        console.log("Enviando prompt para GPT-4o...");

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Você é um assistente útil que gera JSON." },
                { role: "user", content: prompt }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Resposta vazia da OpenAI.");

        const jsonResponse = JSON.parse(content);

        // Tratamento de dados para garantir formato
        let chaptersArray: string[] = [];
        if (Array.isArray(jsonResponse.chapters)) {
            chaptersArray = jsonResponse.chapters;
        } else if (typeof jsonResponse.chapters === 'string') {
            chaptersArray = jsonResponse.chapters.split('\n');
        }

        // 1. Validação de Regex (MM:SS)
        const formattedChapters = chaptersArray.map(chapter => {
            // Regex para capturar horas, minutos e segundos opcionais no início
            const timeMatch = chapter.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s?[-–]\s?(.*)/);

            if (timeMatch) {
                let part1 = timeMatch[1];
                let part2 = timeMatch[2];
                let part3 = timeMatch[3];
                let text = timeMatch[4];

                // Se tiver 3 partes (00:05:30), ignoramos a primeira parte (horas) se for 00
                if (part3) {
                    return `${part2.padStart(2, '0')}:${part3.padStart(2, '0')} – ${text}`;
                }

                // Se tiver 2 partes (05:30), apenas garantimos 2 dígitos
                return `${part1.padStart(2, '0')}:${part2.padStart(2, '0')} – ${text}`;
            }
            return chapter;
        });

        // 2. Filtro de Segurança (Remover capítulos muito próximos)
        // Garante que não haja capítulos com diferença menor que 10 segundos
        const cleanChapters: string[] = [];
        let lastSeconds = -100; // Começa negativo para aceitar 00:00

        formattedChapters.forEach(chapter => {
            const timeMatch = chapter.match(/^(\d{2}):(\d{2})/);
            if (timeMatch) {
                const currentSeconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);

                // Se for o capítulo 00:00 (Introduction), sempre aceita e reseta a contagem
                if (currentSeconds === 0) {
                    cleanChapters.push(chapter);
                    lastSeconds = 0;
                    return;
                }

                // Para os outros, verifica se a distância é maior que 10 segundos do anterior
                if (currentSeconds - lastSeconds > 10) {
                    cleanChapters.push(chapter);
                    lastSeconds = currentSeconds;
                } else {
                    console.log(`Capítulo removido por ser muito próximo (${currentSeconds}s): ${chapter}`);
                }
            } else {
                // Se não tiver timestamp reconhecível, mantém (pode ser erro de formatação, melhor não deletar)
                cleanChapters.push(chapter);
            }
        });

        return {
            intro: Array.isArray(jsonResponse.intro) ? jsonResponse.intro.join('\n\n') : (jsonResponse.intro || ""),
            chapters: cleanChapters,
            hashtags: jsonResponse.hashtags || ""
        };

    } catch (error: any) {
        console.error("Erro na geração OpenAI:", error);
        throw new Error(error.message || "Ocorreu um erro ao gerar a descrição.");
    }
};

export interface GeneratedContent {
    intro: string;
    chapters: string[];
    hashtags: string;
    description_rationale?: string;
    chapters_rationale?: string;
}

const API_URL = (import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://yt-dashboard-backend.vercel.app')) + '/openai';

export const transcribeAudioOpenAI = async (fileUrl: string): Promise<string> => {
    try {
        console.log("Iniciando transcrição via Backend (URL)...");

        const response = await fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileUrl })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend Error (${response.status}): ${errorText}`);
        }

        const transcriptionText = await response.text();
        return transcriptionText;

    } catch (error: any) {
        console.error("Erro na transcrição OpenAI (Backend):", error);
        throw new Error(error.message || "Erro ao transcrever áudio.");
    }
};

export const generateDescriptionOpenAI = async (
    transcriptionText: string,
    videoTitle: string
): Promise<GeneratedContent> => {
    try {
        console.log("Enviando solicitação de descrição para Backend...");

        const response = await fetch(`${BACKEND_URL}/generate-description`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcription: transcriptionText,
                title: videoTitle
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend Error (${response.status}): ${errorText}`);
        }

        return await response.json();

    } catch (error: any) {
        console.error("Erro na geração de descrição (Backend):", error);
        throw new Error(error.message || "Ocorreu um erro ao gerar a descrição.");
    }
};

export const generateEmailOpenAI = async (
    videoTitle: string,
    videoDescription: string,
    videoUrl: string
): Promise<{ subject: string; body: string }> => {
    try {
        const response = await fetch(`${BACKEND_URL}/generate-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: videoTitle,
                description: videoDescription,
                url: videoUrl
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend Error (${response.status}): ${errorText}`);
        }

        return await response.json();

    } catch (error: any) {
        console.error("Erro na geração de email OpenAI (Backend):", error);
        throw new Error(error.message || "Ocorreu um erro ao gerar o email.");
    }
};

import { API_URL as BACKEND_API_URL, apiFetch } from './apiClient';

export interface GeniusInsight {
    ideas: string;
    thinking: string;
}

export const fetchVideoIdeas = async (): Promise<GeniusInsight> => {
    try {
        const res = await apiFetch(`${BACKEND_API_URL}/genius/video-ideas`);
        if (!res.ok) throw new Error("Failed to fetch video ideas");
        return await res.json();
    } catch (error) {
        console.error("Error fetching video ideas:", error);
        throw error;
    }
};

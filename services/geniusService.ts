const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'https://yt-dashboard-backend.vercel.app/api';

export interface GeniusInsight {
    ideas: string;
    thinking: string;
}

export const fetchVideoIdeas = async (): Promise<GeniusInsight> => {
    try {
        const res = await fetch(`${BACKEND_API_URL}/genius/video-ideas`);
        if (!res.ok) throw new Error("Failed to fetch video ideas");
        return await res.json();
    } catch (error) {
        console.error("Error fetching video ideas:", error);
        throw error;
    }
};

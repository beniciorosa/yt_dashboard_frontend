import { supabase } from './supabaseClient';

/** Única definição do endereço do backend (sem barra final, sem /api). */
export const BACKEND_URL: string =
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.DEV ? 'http://localhost:8080' : 'https://yt-dashboard-backend.vercel.app');

export const API_URL = `${BACKEND_URL}/api`;

/**
 * fetch que anexa o token da sessão do app (Supabase) nas chamadas ao nosso backend.
 * Chamadas para outros hosts (ex.: googleapis.com) passam sem alteração.
 */
export const apiFetch = async (input: string | URL, init: RequestInit = {}): Promise<Response> => {
    const url = input.toString();
    if (!url.startsWith(BACKEND_URL)) return fetch(input, init);

    const headers = new Headers(init.headers);
    if (!headers.has('Authorization')) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
};

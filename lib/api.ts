import { QueryClient } from '@tanstack/react-query';
import { API_URL, apiFetch } from '../services/apiClient';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
    },
});

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

/** Chamada JSON ao backend. Lança ApiError com a mensagem do servidor — nada de zeros silenciosos. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const hasBody = init.body !== undefined;
    const res = await apiFetch(`${API_URL}${path}`, {
        ...init,
        headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = typeof body?.message === 'string' ? body.message : `Erro ${res.status}`;
        throw new ApiError(res.status, message);
    }
    return res.status === 204 ? (undefined as T) : res.json();
}

export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

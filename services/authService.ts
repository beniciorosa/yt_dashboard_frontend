import { API_URL, apiFetch } from './apiClient';

// Conexão do canal do YouTube (OAuth Google). O client secret e o refresh_token vivem só no
// backend; o navegador guarda apenas o access_token de curta duração.
const GOOGLE_CLIENT_ID = '271641116604-ghj5qe7mlpfq9qu8prk31seavncelkpc.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
  'https://www.googleapis.com/auth/youtubepartner',
  'https://www.googleapis.com/auth/youtube.force-ssl',
].join(' ');

const TOKEN_KEY = 'yt_access_token';
const EXPIRY_KEY = 'yt_token_expiry';
const CHANNEL_KEY = 'yt_channel_id';
const LEGACY_REFRESH_KEY = 'yt_refresh_token';

const OAUTH_URL = `${API_URL}/youtube/oauth`;

// Precisa estar cadastrada no Google Cloud Console (em produção é o domínio do app).
const redirectUri = () => import.meta.env.VITE_OAUTH_REDIRECT_URI || window.location.origin;

const clearSession = () => {
  [TOKEN_KEY, EXPIRY_KEY, CHANNEL_KEY, LEGACY_REFRESH_KEY].forEach((k) => localStorage.removeItem(k));
};

export const initiateLogin = () => {
  clearSession();

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri())}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  window.location.href = url;
};

const storeAccessToken = (data: { access_token: string; expires_in?: number; channelId?: string }) => {
  const expiresIn = Number(data.expires_in) || 3599;
  // margem de 60 s
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(EXPIRY_KEY, (Date.now() + (expiresIn - 60) * 1000).toString());
  if (data.channelId) localStorage.setItem(CHANNEL_KEY, data.channelId);
};

export const handleAuthCallback = async (code: string): Promise<boolean> => {
  try {
    const res = await apiFetch(`${OAUTH_URL}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: redirectUri() }),
    });
    if (!res.ok) {
      console.error('Falha ao conectar o canal:', await res.text());
      return false;
    }
    storeAccessToken(await res.json());
    return true;
  } catch (error) {
    console.error('Auth error:', error);
    return false;
  }
};

/**
 * Tokens vindos do login Google do próprio app (Supabase provider). O refresh_token,
 * quando existe, é entregue ao backend e não fica no navegador.
 */
export const saveSession = (data: { access_token: string; refresh_token?: string | null; expires_in?: number }) => {
  storeAccessToken(data);
  if (data.refresh_token) {
    apiFetch(`${OAUTH_URL}/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: data.access_token, refreshToken: data.refresh_token }),
    })
      .then(async (res) => {
        if (res.ok) storeAccessToken({ access_token: data.access_token, expires_in: data.expires_in, ...(await res.json()) });
        else console.warn('Falha ao salvar a conexão do canal no backend:', await res.text());
      })
      .catch(console.error);
  }
};

export const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token || !expiry) return null;

  if (!forceRefresh && Date.now() < parseInt(expiry, 10)) return token;

  try {
    const res = await apiFetch(`${OAUTH_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: localStorage.getItem(CHANNEL_KEY) || undefined }),
    });
    if (res.status === 409) {
      // refresh_token ausente ou revogado no servidor: o canal precisa ser reconectado
      console.warn('Canal precisa ser reconectado:', await res.text());
      clearSession();
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    storeAccessToken(data);
    return data.access_token;
  } catch (e) {
    // erro de rede: não derruba a sessão
    console.error('Error refreshing token:', e);
    return null;
  }
};

export const logout = () => {
  clearSession();
  window.location.href = '/';
};

export const isAuthenticated = (): boolean => !!localStorage.getItem(TOKEN_KEY);

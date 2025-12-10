// --- START OF FILE services/authService.ts ---
import { AUTH_CONFIG } from './authConfig';

const TOKEN_KEY = 'yt_access_token';
const REFRESH_KEY = 'yt_refresh_token';
const EXPIRY_KEY = 'yt_token_expiry';

export const initiateLogin = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(AUTH_CONFIG.clientId)}` +
    `&redirect_uri=${encodeURIComponent(AUTH_CONFIG.redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(AUTH_CONFIG.scopes)}` +
    `&access_type=offline` + 
    `&prompt=consent`;

  window.location.href = url;
};

export const handleAuthCallback = async (code: string): Promise<boolean> => {
  try {
    console.log("Exchanging code for token (Client-Side)...");
    
    // Troca direta com Google
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: AUTH_CONFIG.clientId,
        client_secret: AUTH_CONFIG.clientSecret, 
        redirect_uri: AUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    console.log("Token exchange response:", data);
    
    if (data.error) {
      console.error('Error exchanging token:', data);
      return false;
    }

    saveSession(data);
    return true;
  } catch (error) {
    console.error('Auth error:', error);
    return false;
  }
};

const saveSession = (data: any) => {
    // Ensure numeric calculation
    const expiresIn = Number(data.expires_in) || 3599;
    // Buffer of 60 seconds
    const expiryTime = Date.now() + (expiresIn - 60) * 1000;
    
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    
    // Only overwrite refresh token if a new one is provided (refresh flows don't always return it)
    if (data.refresh_token) {
        localStorage.setItem(REFRESH_KEY, data.refresh_token);
    }
};

export const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);

  if (!token || !expiry) return null;

  const isExpired = Date.now() >= parseInt(expiry, 10);

  // If we are not forcing a refresh and the token is still valid, return it
  if (!forceRefresh && !isExpired) {
      return token;
  }

  // If we need to refresh (expired or forced) but have no refresh token, we can't do anything
  if (!refreshToken) {
      console.warn("Token expired and no refresh token available.");
      logout();
      return null;
  }

  try {
      console.log("Refreshing token...");
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: AUTH_CONFIG.clientId,
            client_secret: AUTH_CONFIG.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
      });
      
      const data = await response.json();
      
      if (data.access_token) {
          saveSession(data);
          return data.access_token;
      } else {
          console.error("Refresh failed", data);
          // Only logout if it's strictly a permission/bad request error which implies the refresh token is dead
          if (data.error === 'invalid_grant') {
              logout();
          }
          return null;
      }
  } catch (e) {
      console.error("Error refreshing token:", e);
      // Don't logout on network error, just return null so the app handles it gracefully
      return null;
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  window.location.href = '/'; 
};

export const isAuthenticated = (): boolean => {
  // Simple check for presence of token
  return !!localStorage.getItem(TOKEN_KEY);
};
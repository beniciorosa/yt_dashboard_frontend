// --- START OF FILE services/authConfig.ts ---
export const AUTH_CONFIG = {
  clientId: '271641116604-ghj5qe7mlpfq9qu8prk31seavncelkpc.apps.googleusercontent.com',
  // Credencial exposta para funcionamento Client-Side (Corrigida)
  clientSecret: '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',
  // A URL deve corresponder exatamente à registrada no Google Cloud Console
  redirectUri: 'https://yt-dashboard-frontend.vercel.app',
  scopes: [
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
    'https://www.googleapis.com/auth/youtubepartner',
    
  ].join(' '),
};

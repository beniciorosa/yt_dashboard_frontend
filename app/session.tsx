import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { getAccessToken, handleAuthCallback, initiateLogin, isAuthenticated, saveSession } from '../services/authService';

type Theme = 'light' | 'dark';

export interface SessionValue {
    /** Sessão do app (Supabase). null = não logado. */
    session: Session | null;
    loading: boolean;
    role: string;
    /** Canal do YouTube conectado (OAuth Google). */
    youtubeConnected: boolean;
    connectingYoutube: boolean;
    connectYoutube: () => void;
    signOut: () => Promise<void>;
    theme: Theme;
    setTheme: (t: Theme) => void;
}

// Código devolvido pelo consentimento do Google (?code=...), lido no carregamento do módulo:
// o roteador redireciona "/" para a tela inicial e descarta a query antes dos efeitos rodarem.
const initialOAuthCode = new URLSearchParams(window.location.search).get('code');

export const SessionContext = createContext<SessionValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('user');
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [connectingYoutube, setConnectingYoutube] = useState(false);
    const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('theme') === 'light' ? 'light' : 'dark'));
    const oauthChecked = useRef(false);

    const setTheme = useCallback((t: Theme) => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        localStorage.setItem('theme', t);
        setThemeState(t);
    }, []);

    useEffect(() => {
        const apply = (s: Session | null) => {
            setSession(s);
            if (!s?.user) return;
            supabase.from('user_roles').select('role').eq('id', s.user.id).single().then(({ data }) => {
                if (data?.role) setRole(data.role);
            });
            // Login do app feito com Google: aproveita o token do provedor para o YouTube.
            if (s.provider_token) {
                saveSession({ access_token: s.provider_token, refresh_token: s.provider_refresh_token, expires_in: 3599 });
                setYoutubeConnected(true);
            }
        };

        supabase.auth.getSession().then(({ data }) => {
            apply(data.session);
            setLoading(false);
        });
        const { data } = supabase.auth.onAuthStateChange((_event, s) => apply(s));
        return () => data.subscription.unsubscribe();
    }, []);

    // Volta do consentimento Google (?code=...) ou sessão do YouTube já existente.
    useEffect(() => {
        if (!session || oauthChecked.current) return;
        oauthChecked.current = true;

        (async () => {
            const code = initialOAuthCode;
            if (!code) {
                setYoutubeConnected(isAuthenticated());
                return;
            }
            if (await getAccessToken()) {
                setYoutubeConnected(true);
                return;
            }
            setConnectingYoutube(true);
            setYoutubeConnected(await handleAuthCallback(code));
            setConnectingYoutube(false);
        })();
    }, [session]);

    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Erro ao deslogar:', e);
        }
        // Remove só o que é login; preferências locais (tema, versus) ficam.
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') || key.startsWith('yt_')) localStorage.removeItem(key);
        });
        window.location.replace(window.location.origin);
    }, []);

    const value = useMemo<SessionValue>(() => ({
        session, loading, role, youtubeConnected, connectingYoutube,
        connectYoutube: initiateLogin, signOut, theme, setTheme,
    }), [session, loading, role, youtubeConnected, connectingYoutube, signOut, theme, setTheme]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession fora do SessionProvider');
    return ctx;
};

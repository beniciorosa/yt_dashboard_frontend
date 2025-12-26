import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CompetitorsModule } from './components/CompetitorsModule';
import { ChannelDashboard } from './components/ChannelDashboard';
import { DescriptionGenerator } from './components/DescriptionGenerator';
import { SettingsModal } from './components/SettingsModal';
import { UtmGenerator } from './components/UtmGenerator';
import { CommentsDashboard } from './components/Comments/CommentsDashboard';
import { PromotionsDashboard } from './components/Promotions/PromotionsDashboard';
import { SalesMetricsDashboard } from './components/SalesMetrics/SalesMetricsDashboard';
import { UserManagement } from './components/Admin/UserManagement';
import { Login } from './components/Login';
import { handleAuthCallback, initiateLogin, logout, isAuthenticated, getAccessToken, saveSession } from './services/authService';
import { supabase } from './services/supabaseClient';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'dashboard' | 'competitors' | 'description-gen' | 'utm-gen' | 'comments' | 'promotions' | 'sales-metrics' | 'users'>('competitors');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // App Auth State
  const [session, setSession] = useState<any>(null);
  const [isAppAuthLoading, setIsAppAuthLoading] = useState(true);

  // Google Auth State Management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  const authCheckRan = useRef(false);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check App Session
  useEffect(() => {
    const checkAppAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);

        // SYNC: If we have a provider token (Google), sync it with our YouTube auth system
        if (session.provider_token) {
          saveSession({
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token,
            expires_in: 3599 // Default
          });
          setIsLoggedIn(true);
        }
      }
      setIsAppAuthLoading(false);
    };

    checkAppAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);

        if (session.provider_token) {
          saveSession({
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token,
            expires_in: 3599
          });
          setIsLoggedIn(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();
      if (data) setUserRole(data.role);
    } catch (e) { console.error(e); }
  };

  // Check Google Auth (only if app session exists)
  useEffect(() => {
    if (!session || authCheckRan.current) return;
    authCheckRan.current = true;

    const checkGoogleAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const existingToken = await getAccessToken();

      if (code) {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (existingToken) {
          setIsLoggedIn(true);
        } else {
          setIsAuthProcessing(true);
          const success = await handleAuthCallback(code);
          setIsLoggedIn(success);
          setIsAuthProcessing(false);
        }
      } else {
        setIsLoggedIn(isAuthenticated());
      }
    };

    checkGoogleAuth();
  }, [session]);

  const handleLogin = () => initiateLogin();
  const handleLogout = async () => {
    setIsLoggedIn(false);
    setIsSettingsOpen(false);
    setSession(null);

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Erro ao deslogar:", e);
    }

    // Limpeza CIRÚRGICA: Remove apenas o que é login, mantém o resto (como VERSUS)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('yt_')) {
        localStorage.removeItem(key);
      }
    });

    // Redirect limpando a URL de qualquer rastro de hash ou code
    window.location.replace(window.location.origin);
  };

  if (isAppAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-white">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <h2 className="text-gray-400 font-medium">Iniciando aplicação...</h2>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => window.location.reload()} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      <Sidebar
        activeModule={activeModule}
        onNavigate={setActiveModule}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        userRole={userRole}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6 sticky top-0 z-20 transition-colors duration-200">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white">
            {activeModule === 'dashboard' && 'Dashboard do Canal'}
            {activeModule === 'competitors' && 'Ferramentas de YouTube'}
            {activeModule === 'description-gen' && 'Gerador de Descrição'}
            {activeModule === 'utm-gen' && 'Gerador de UTM'}
            {activeModule === 'comments' && 'Gestão de Comentários'}
            {activeModule === 'promotions' && 'Minhas Promoções'}
            {activeModule === 'sales-metrics' && 'Sales Metrics'}
            {activeModule === 'users' && 'Gestão de Usuários'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden md:inline">v1.9.1 (Protected)</span>
          </div>
        </header>

        <main className="p-6 lg:p-8 flex-1 overflow-y-auto">
          {activeModule === 'competitors' && <CompetitorsModule />}
          {activeModule === 'dashboard' && <ChannelDashboard isLoggedIn={isLoggedIn} />}
          {activeModule === 'description-gen' && <DescriptionGenerator />}
          {activeModule === 'utm-gen' && <UtmGenerator />}
          {activeModule === 'comments' && <CommentsDashboard />}
          {activeModule === 'promotions' && <PromotionsDashboard />}
          {activeModule === 'sales-metrics' && <SalesMetricsDashboard />}
          {activeModule === 'users' && <UserManagement />}
        </main>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </div>
  );
};

export default App;
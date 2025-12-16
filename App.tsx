// --- START OF FILE App.tsx ---
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CompetitorsModule } from './components/CompetitorsModule';
import { ChannelDashboard } from './components/ChannelDashboard';
import { DescriptionGenerator } from './components/DescriptionGenerator';
import { SettingsModal } from './components/SettingsModal';
import { UtmGenerator } from './components/UtmGenerator';
import { CommentsDashboard } from './components/Comments/CommentsDashboard';
import { PromotionsDashboard } from './components/Promotions/PromotionsDashboard';
import { handleAuthCallback, initiateLogin, logout, isAuthenticated, getAccessToken } from './services/authService';
import { Loader2, Wrench } from 'lucide-react';

const App: React.FC = () => {
  // Updated state type to include new tool modules
  const [activeModule, setActiveModule] = useState<'dashboard' | 'competitors' | 'description-gen' | 'utm-gen' | 'comments' | 'promotions'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Google Auth State Management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthProcessing, setIsAuthProcessing] = useState(true);

  // Ref to prevent double execution in React StrictMode
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

  // Check Google Auth
  useEffect(() => {
    if (authCheckRan.current) return;
    authCheckRan.current = true;

    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      // 1. Check if we already have a potentially valid session
      // This check avoids re-exchanging a stale code if a session exists
      const existingToken = await getAccessToken();

      if (code) {
        // Remove code from URL immediately to prevent reuse attempts visual clutter
        window.history.replaceState({}, document.title, window.location.pathname);

        // If we already have a valid token (not expired), skip the code exchange
        // This happens if the user reloads the page before the URL is cleaned or double-fired
        if (existingToken) {
          console.log("Valid session found, ignoring auth code.");
          setIsLoggedIn(true);
          setActiveModule('dashboard');
          setIsAuthProcessing(false);
          return;
        }

        const success = await handleAuthCallback(code);
        if (success) {
          setIsLoggedIn(true);
          setActiveModule('dashboard');
        } else {
          alert('Falha na autenticação com Google. Tente novamente.');
        }
      } else {
        setIsLoggedIn(isAuthenticated());
      }
      setIsAuthProcessing(false);
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    initiateLogin();
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setIsSettingsOpen(false);
  };

  if (isAuthProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <h2 className="text-gray-600 dark:text-gray-300 font-medium">Carregando...</h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onNavigate={setActiveModule}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6 sticky top-0 z-20 transition-colors duration-200">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white">
            {activeModule === 'dashboard' && 'Dashboard do Canal'}
            {activeModule === 'competitors' && 'Ferramentas de YouTube'}
            {activeModule === 'description-gen' && 'Gerador de Descrição'}
            {activeModule === 'utm-gen' && 'Gerador de UTM'}
            {activeModule === 'comments' && 'Gestão de Comentários'}
            {activeModule === 'promotions' && 'Minhas Promoções'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden md:inline">v1.8.2</span>
          </div>
        </header>

        {/* Module Content */}
        <main className="p-6 lg:p-8 flex-1 overflow-y-auto">
          {activeModule === 'competitors' && <CompetitorsModule />}

          {activeModule === 'dashboard' && (
            <ChannelDashboard isLoggedIn={isLoggedIn} />
          )}

          {activeModule === 'description-gen' && (
            <DescriptionGenerator />
          )}

          {activeModule === 'utm-gen' && (
            <UtmGenerator />
          )}

          {activeModule === 'comments' && (
            <CommentsDashboard />
          )}

          {activeModule === 'promotions' && (
            <PromotionsDashboard />
          )}
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
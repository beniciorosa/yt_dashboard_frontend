import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { queryClient } from './lib/api';
import { PeriodProvider } from './lib/period';
import { SessionProvider, useSession } from './app/session';
import { AppShell } from './app/AppShell';
import { HOME_PATH } from './app/nav';
import { ToastProvider } from './components/ui';
import { Login } from './components/Login';
import { CompetitorsModule } from './components/CompetitorsModule';
import { ChannelDashboard } from './components/ChannelDashboard';
import { DescriptionGenerator } from './components/DescriptionGenerator';
import { UtmGenerator } from './components/UtmGenerator';
import { CommentsDashboard } from './components/Comments/CommentsDashboard';
import { PromotionsModule } from './components/Promotions/PromotionsModule';
import { SalesPage } from './pages/SalesPage';
import { UserManagement } from './components/Admin/UserManagement';
import { GeniusDashboard } from './components/Genius/GeniusDashboard';
import { ClosersPage } from './pages/ClosersPage';
import { AttributionPage } from './pages/AttributionPage';
import { VideoTypesPage } from './pages/VideoTypesPage';

const FullScreenLoader: React.FC<{ label: string }> = ({ label }) => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-canvas text-fg-muted">
        <Loader2 className="animate-spin text-accent" size={28} />
        <span className="text-sm">{label}</span>
    </div>
);

const AppRoutes: React.FC = () => {
    const { session, loading, role, youtubeConnected, connectingYoutube } = useSession();

    if (loading) return <FullScreenLoader label="Iniciando…" />;
    if (!session) return <Login onLoginSuccess={() => window.location.reload()} />;
    if (connectingYoutube) return <FullScreenLoader label="Conectando o canal do YouTube…" />;

    return (
        <Routes>
            <Route element={<AppShell />}>
                <Route path="/canal" element={<ChannelDashboard isLoggedIn={youtubeConnected} />} />
                <Route path="/canal/tipos" element={<VideoTypesPage />} />
                <Route path="/receita/vendas" element={<SalesPage />} />
                <Route path="/receita/closers" element={<ClosersPage />} />
                <Route path="/receita/atribuicao" element={<AttributionPage />} />
                <Route path="/receita/promocoes" element={<PromotionsModule />} />
                <Route path="/estudio/descricoes" element={<DescriptionGenerator />} />
                <Route path="/estudio/links" element={<UtmGenerator />} />
                <Route path="/estudio/comentarios" element={<CommentsDashboard />} />
                <Route path="/estudio/genius" element={<GeniusDashboard />} />
                <Route path="/mercado/concorrencia" element={<CompetitorsModule />} />
                {role === 'admin' && <Route path="/admin/usuarios" element={<UserManagement />} />}
                <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
            </Route>
        </Routes>
    );
};

const App: React.FC = () => (
    <QueryClientProvider client={queryClient}>
        <BrowserRouter>
            <SessionProvider>
                <PeriodProvider>
                    <ToastProvider>
                        <AppRoutes />
                    </ToastProvider>
                </PeriodProvider>
            </SessionProvider>
        </BrowserRouter>
    </QueryClientProvider>
);

export default App;

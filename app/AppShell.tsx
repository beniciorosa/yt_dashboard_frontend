import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { Freshness } from './Freshness';
import { ALL_NAV_ITEMS } from './nav';
import { useSession } from './session';
import { PeriodPicker } from '../components/ui';
import { SettingsModal } from '../components/SettingsModal';

const COLLAPSED_KEY = 'sidebar_collapsed';

export const AppShell: React.FC = () => {
    const { pathname } = useLocation();
    const { youtubeConnected, connectYoutube, signOut, theme, setTheme } = useSession();
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // o item de caminho mais longo vence (/canal/tipos antes de /canal)
    const current = [...ALL_NAV_ITEMS]
        .sort((a, b) => b.path.length - a.path.length)
        .find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const toggleSidebar = () => {
        setCollapsed((c) => {
            localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
            return !c;
        });
    };

    return (
        <div className="flex min-h-screen bg-canvas text-fg">
            <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onOpenSettings={() => setSettingsOpen(true)} />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-12 shrink-0 sticky top-0 z-20 flex items-center justify-between gap-4 px-5 bg-canvas/85 backdrop-blur border-b border-line">
                    <h1 className="text-sm font-bold text-fg truncate">{current?.title || 'Escalada'}</h1>
                    <div className="flex items-center gap-4 shrink-0">
                        <Freshness />
                        {current?.usesPeriod && <PeriodPicker />}
                        <button
                            onClick={() => setPaletteOpen(true)}
                            className="hidden md:inline-flex items-center gap-2 h-7 pl-2 pr-1.5 rounded-md bg-surface-2 border border-line text-xs text-fg-subtle hover:text-fg"
                        >
                            <Search size={13} />
                            <span className="hidden lg:inline">Ir para</span>
                            <kbd className="px-1 rounded bg-surface border border-line font-mono text-[10px] whitespace-nowrap">Ctrl K</kbd>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-5 lg:p-6 min-w-0">
                    <Outlet />
                </main>
            </div>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

            {settingsOpen && (
                <SettingsModal
                    onClose={() => setSettingsOpen(false)}
                    isLoggedIn={youtubeConnected}
                    onLogin={connectYoutube}
                    onLogout={signOut}
                    theme={theme}
                    setTheme={setTheme}
                />
            )}
        </div>
    );
};

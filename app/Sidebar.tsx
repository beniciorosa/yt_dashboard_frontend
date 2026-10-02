import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { BRAND_ICON as BrandIcon, NAV } from './nav';
import { useSession } from './session';
import { cn } from '../lib/cn';

interface Props {
    collapsed: boolean;
    onToggle: () => void;
    onOpenSettings: () => void;
}

const itemCls = (active: boolean, collapsed: boolean) => cn(
    'flex items-center gap-2.5 h-8 rounded-md text-[13px] font-medium transition-colors',
    collapsed ? 'justify-center px-0' : 'px-2.5',
    active ? 'bg-surface-hover text-fg' : 'text-fg-muted hover:text-fg hover:bg-surface-2',
);

export const Sidebar: React.FC<Props> = ({ collapsed, onToggle, onOpenSettings }) => {
    const { role, signOut, session } = useSession();

    return (
        <aside className={cn('h-screen sticky top-0 shrink-0 flex flex-col bg-surface border-r border-line transition-[width] duration-200', collapsed ? 'w-14' : 'w-56')}>
            <div className={cn('h-12 flex items-center border-b border-line', collapsed ? 'justify-center' : 'justify-between px-3')}>
                {!collapsed && (
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="h-6 w-6 rounded-md bg-accent text-accent-fg inline-flex items-center justify-center shrink-0">
                            <BrandIcon size={14} />
                        </span>
                        <span className="text-sm font-semibold text-fg truncate">Escalada</span>
                    </div>
                )}
                <button onClick={onToggle} title={collapsed ? 'Expandir menu' : 'Recolher menu'} className="p-1.5 rounded text-fg-subtle hover:text-fg hover:bg-surface-2">
                    {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-2 space-y-4">
                {NAV.map((group) => {
                    const items = group.items.filter((i) => !i.adminOnly || role === 'admin');
                    if (items.length === 0) return null;
                    return (
                        <div key={group.label}>
                            {!collapsed && <div className="px-2.5 mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{group.label}</div>}
                            <div className="space-y-0.5">
                                {items.map((item) => (
                                    <NavLink key={item.path} to={item.path} end title={collapsed ? item.label : undefined} className={({ isActive }) => itemCls(isActive, collapsed)}>
                                        <item.icon size={16} className="shrink-0" />
                                        {!collapsed && <span className="truncate">{item.label}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div className="p-2 border-t border-line space-y-0.5">
                <button onClick={onOpenSettings} title="Configurações" className={cn(itemCls(false, collapsed), 'w-full')}>
                    <Settings size={16} className="shrink-0" />
                    {!collapsed && <span>Configurações</span>}
                </button>
                <button onClick={signOut} title="Sair" className={cn(itemCls(false, collapsed), 'w-full')}>
                    <LogOut size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate">Sair{session?.user.email ? ` · ${session.user.email.split('@')[0]}` : ''}</span>}
                </button>
            </div>
        </aside>
    );
};

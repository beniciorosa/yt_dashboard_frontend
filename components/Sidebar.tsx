// --- START OF FILE components/Sidebar.tsx ---
import React from 'react';
import {
  LayoutDashboard, LineChart, ChevronLeft, ChevronRight,
  BarChart3, Settings, Type, Link, Wrench, MessageSquare,
  Megaphone, DollarSign, Users, LogOut
} from 'lucide-react';

interface Props {
  activeModule: 'dashboard' | 'competitors' | 'description-gen' | 'utm-gen' | 'comments' | 'promotions' | 'sales-metrics' | 'users';
  onNavigate: (module: 'dashboard' | 'competitors' | 'description-gen' | 'utm-gen' | 'comments' | 'promotions' | 'sales-metrics' | 'users') => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeModule,
  onNavigate,
  isCollapsed,
  toggleCollapse,
  onOpenSettings,
  onLogout,
  userRole
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 flex flex-col transition-all duration-300 relative ${isCollapsed ? 'w-[70px]' : 'w-64'
        }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-center border-b border-gray-100 dark:border-gray-700 relative">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
          <Youtube size={24} className="text-white" />
        </div>
        {!isCollapsed && (
          <span className="ml-3 font-bold text-gray-900 dark:text-white text-lg tracking-tight whitespace-nowrap overflow-hidden">
            YT Escalada
          </span>
        )}
      </div>

      {/* Collapse Button - On Border */}
      <button
        onClick={toggleCollapse}
        className="absolute z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-gray-500 right-0 translate-x-1/2 top-20"
        title={isCollapsed ? "Expandir" : "Recolher"}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Nav Items */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">

        {/* Main Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Principal
            </p>
          )}
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 ${activeModule === 'dashboard'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            title="Channel Dashboard"
          >
            <LayoutDashboard size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Dashboard</span>}
          </button>

          <button
            onClick={() => onNavigate('competitors')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeModule === 'competitors'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            title="Análise de Concorrência"
          >
            <LineChart size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Concorrência</span>}
          </button>
        </div>

        {/* Escalada Metrics Section */}
        <div className="mb-6">
          {!isCollapsed ? (
            <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 mt-6">
              Escalada Metrics
            </p>
          ) : (
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-4 mx-2"></div>
          )}

          <button
            onClick={() => onNavigate('sales-metrics')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 ${activeModule === 'sales-metrics'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            title="Sales Metrics"
          >
            <DollarSign size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Sales Metrics</span>}
          </button>

          <button
            onClick={() => onNavigate('promotions')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 ${activeModule === 'promotions'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            title="Promoções"
          >
            <Megaphone size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Promoções</span>}
          </button>
        </div>

        {/* Tools Section */}
        <div>
          {!isCollapsed ? (
            <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 mt-6">
              Ferramentas
            </p>
          ) : (
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-4 mx-2"></div>
          )}

          <button
            onClick={() => onNavigate('description-gen')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 ${activeModule === 'description-gen'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            title="Gerador de Descrição"
          >
            <Type size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Gerador de Descrição</span>}
          </button>

          <button
            onClick={() => onNavigate('comments')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 ${activeModule === 'comments'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            title="Gestão de Comentários"
          >
            <MessageSquare size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Comentários</span>}
          </button>

          <button
            onClick={() => onNavigate('utm-gen')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeModule === 'utm-gen'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            title="Gerador de UTM"
          >
            <Link size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Gerador de UTM</span>}
          </button>

          {userRole === 'admin' && (
            <button
              onClick={() => onNavigate('users')}
              className={`w-full flex items-center p-3 rounded-lg transition-colors mt-1 ${activeModule === 'users'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              title="Gestão de Usuários"
            >
              <Users size={20} className="shrink-0" />
              {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Usuários</span>}
            </button>
          )}
        </div>

      </nav>

      {/* Settings & Logout Footer */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center p-3 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          title="Configurações"
        >
          <Settings size={20} className="shrink-0" />
          {!isCollapsed && (
            <span className="ml-3 font-medium whitespace-nowrap">
              Configurações
            </span>
          )}
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center p-3 rounded-lg transition-colors text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          title="Sair"
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && (
            <span className="ml-3 font-medium whitespace-nowrap">
              Sair
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
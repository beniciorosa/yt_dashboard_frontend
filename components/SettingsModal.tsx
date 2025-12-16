import React, { useState } from 'react';
import { X, Settings, Moon, Sun, LogIn, LogOut, Check, RefreshCw } from 'lucide-react';
import { syncVideos, VideoSyncStatus } from '../services/videosService';

interface Props {
  onClose: () => void;
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose, isLoggedIn, onLogin, onLogout, theme, setTheme }) => {
  const [isSyncingVideos, setIsSyncingVideos] = useState(false);
  const [syncStatus, setSyncStatus] = useState<VideoSyncStatus>({ total: 0, processed: 0, isSyncing: false });

  const handleSyncVideos = async () => {
    setIsSyncingVideos(true);
    setSyncStatus({ total: 0, processed: 0, isSyncing: true });
    try {
      await syncVideos((status) => {
        setSyncStatus(status);
        if (!status.isSyncing) setIsSyncingVideos(false);
      });
    } catch (e) {
      console.error(e);
      setIsSyncingVideos(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden transition-colors duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Settings size={20} /> Configurações
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* Theme Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Aparência</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${theme === 'light'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                <Sun size={20} />
                <span className="font-medium">Claro</span>
                {theme === 'light' && <Check size={16} className="ml-auto" />}
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                <Moon size={20} />
                <span className="font-medium">Escuro</span>
                {theme === 'dark' && <Check size={16} className="ml-auto" />}
              </button>
            </div>
          </div>

          {/* Auth Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Conexões</h3>
            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg border border-gray-100 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm">
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">YouTube Analytics</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isLoggedIn ? 'Conectado e sincronizando' : 'Acesso a dados privados'}
                    </p>
                  </div>
                </div>
                {isLoggedIn && <span className="flex h-3 w-3 rounded-full bg-green-500"></span>}
              </div>

              <button
                onClick={isLoggedIn ? onLogout : onLogin}
                className={`w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${isLoggedIn
                  ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {isLoggedIn ? (
                  <>
                    <LogOut size={18} /> Desconectar Conta
                  </>
                ) : (
                  <>
                    <LogIn size={18} /> Autorizar Acesso
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Database Updates Section */}
          {isLoggedIn && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Base de Dados</h3>
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Meus Vídeos</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Sincronizar metadados e analytics
                    </p>
                  </div>
                </div>

                {!isSyncingVideos ? (
                  <button
                    onClick={handleSyncVideos}
                    className="w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                  >
                    <RefreshCw size={18} /> Atualizar Base de Vídeos
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                      <span>Sincronizando...</span>
                      <span>{syncStatus.processed} / {syncStatus.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: syncStatus.total > 0 ? `${(syncStatus.processed / syncStatus.total) * 100}%` : '0%' }}
                      ></div>
                    </div>
                  </div>
                )}
                {syncStatus.error && (
                  <p className="text-xs text-red-500 mt-2">Erro: {syncStatus.error}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
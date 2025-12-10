import React, { useState } from 'react';
import { verifyUserAccess } from '../services/storageService';
import { Loader2, LogIn, Lock, Mail, User } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const isValid = await verifyUserAccess(userId.trim(), email.trim());
      
      if (isValid) {
        localStorage.setItem('isAppAuthenticated', 'true');
        onLoginSuccess();
      } else {
        setError('Acesso negado. Verifique o ID do Usuário e Email.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">YT Escalada Analytics</h1>
            <p className="text-red-100 text-sm">Área Restrita</p>
        </div>

        {/* Form */}
        <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID do Usuário</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <User size={18} />
                        </div>
                        <input 
                            type="text" 
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors dark:text-white"
                            placeholder="Insira seu UUID"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Autorizado</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Mail size={18} />
                        </div>
                        <input 
                            type="email" 
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors dark:text-white"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg text-center font-medium">
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                    {isLoading ? 'Verificando...' : 'Acessar Painel'}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};
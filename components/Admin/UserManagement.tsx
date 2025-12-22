import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { UserPlus, Users, Trash2, Shield, Mail, Lock, Loader2, Check, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://yt-dashboard-backend.vercel.app');

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_BASE_URL}/api/auth/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) throw new Error('Falha ao carregar usuários');
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_BASE_URL}/api/auth/admin/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ email, password })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Erro ao criar usuário');

            setSuccess(`Usuário ${email} criado com sucesso!`);
            setEmail('');
            setPassword('');
            fetchUsers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" />
                        Gestão de Usuários
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Visualize e crie novos acessos para o dashboard.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User List */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-500" />
                            Usuários Ativos
                        </h3>
                    </div>

                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50/30 dark:bg-gray-800/20">
                                    <tr>
                                        <th className="px-6 py-4">Usuário</th>
                                        <th className="px-6 py-4">Papel (Role)</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                        {u.email?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{u.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Remover (Em breve)">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Create User Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                        <UserPlus className="w-5 h-5 text-green-500" />
                        Novo Usuário
                    </h3>

                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="exemplo@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Inicial</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                <Check className="w-4 h-4" /> {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isCreating}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Conta'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

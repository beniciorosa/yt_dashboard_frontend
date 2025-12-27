import React, { useState } from 'react';
import { Brain, Sparkles, Lightbulb, TrendingUp, ChevronRight, Loader2, MessageCircle, PlayCircle } from 'lucide-react';
import { fetchVideoIdeas, GeniusInsight } from '../../services/geniusService';

export const GeniusDashboard: React.FC = () => {
    const [insight, setInsight] = useState<GeniusInsight | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateIdeas = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchVideoIdeas();
            setInsight(data);
        } catch (err) {
            setError("Não consegui processar os dados agora. Verifique sua conexão ou tente novamente em alguns instantes.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain size={200} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold uppercase tracking-wider">
                            <Sparkles size={14} className="animate-pulse" />
                            Beta Inteligência Artificial
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                            GENIUS <span className="text-purple-200">HUB</span>
                        </h1>
                        <p className="text-lg text-blue-100 max-w-xl font-medium">
                            Análise profunda do seu banco de dados para encontrar padrões, dúvidas e tendências que se tornam vídeos de sucesso.
                        </p>
                    </div>

                    <button
                        onClick={handleGenerateIdeas}
                        disabled={isLoading}
                        className={`group relative flex items-center gap-3 px-8 py-4 bg-white text-blue-700 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                Analisando Histórico...
                            </>
                        ) : (
                            <>
                                <Lightbulb size={24} className="group-hover:text-yellow-500 transition-colors" />
                                Gerar Ideias de Conteúdo
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Current Modules */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            Módulos Disponíveis
                        </h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-center gap-3 transition-all hover:translate-x-1">
                                <MessageCircle className="text-blue-600" />
                                <div>
                                    <p className="font-bold text-sm text-blue-900 dark:text-blue-100">Analista de Comentários</p>
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Analisa perguntas recorrentes no histórico.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-3 opacity-50 grayscale cursor-not-allowed">
                                <PlayCircle className="text-gray-400" />
                                <div>
                                    <p className="font-bold text-sm text-gray-500">Analista de Performance</p>
                                    <p className="text-[10px] text-gray-400">Em desenvolvimento (Vindo em breve)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-3xl border border-purple-100 dark:border-purple-800/50">
                        <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2">Como o Genius pensa?</h4>
                        <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                            Nós utilizamos a tecnologia da <b>OpenAI GPT-5.2 Pro</b>. O Genius analisa profundamente todo o seu histórico buscando conexões neurais avançadas para projetar o futuro do seu canal.
                        </p>
                    </div>
                </div>

                {/* Right Column: AI Output */}
                <div className="lg:col-span-2">
                    {isLoading ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                                <Brain size={64} className="text-blue-600 animate-bounce" />
                            </div>
                            <h3 className="text-xl font-bold dark:text-white">Conectando Neurônios...</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs">
                                Lendo seu histórico completo de interações e buscando padrões para suas próximas ideias de vídeo.
                            </p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-100 dark:border-red-800/50 p-12 text-center text-red-600 dark:text-red-400">
                            <p className="font-bold">{error}</p>
                            <button onClick={handleGenerateIdeas} className="mt-4 text-sm font-bold underline">Tentar novamente</button>
                        </div>
                    ) : insight ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm prose dark:prose-invert max-w-none">
                                <div className="flex items-center gap-2 mb-6 text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest text-xs">
                                    <Sparkles size={16} />
                                    Resultado da Análise
                                </div>
                                {insight.ideas ? (
                                    <div dangerouslySetInnerHTML={{ __html: formatMarkdown(insight.ideas) }} className="genius-content" />
                                ) : (
                                    <div className="text-center py-12 text-gray-500 italic">
                                        A IA processou os dados mas não conseguiu gerar insights conclusivos. Tente novamente ou mude o filtro.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                <div className="h-px w-8 bg-gray-200 dark:bg-gray-700" />
                                {insight.thinking}
                                <div className="h-px w-8 bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center">
                                <Lightbulb size={40} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-400 mb-2">Pronto para começar?</h3>
                                <p className="text-gray-500 max-w-xs">Clique no botão acima para o Genius analisar seus dados e gerar ideias.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .genius-content h1, .genius-content h2 { margin-top: 1.5rem; color: #4F46E5; font-weight: 800; }
                .genius-content h2 { font-size: 1.25rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem; }
                .dark .genius-content h2 { border-color: #374151; color: #818CF8; }
                .genius-content ul { padding-left: 1.25rem; margin-top: 1rem; }
                .genius-content li { margin-bottom: 0.75rem; }
                .genius-content p { line-height: 1.7; margin-bottom: 1rem; }
                .genius-content strong { color: #111827; }
                .dark .genius-content strong { color: #F9FAFB; }
            `}} />
        </div>
    );
};

// Simplified markdown formatter for the demo
function formatMarkdown(text: string) {
    if (!text) return "";
    let html = text
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br />');

    // Wrap lists
    html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');

    return `<p>${html}</p>`;
}

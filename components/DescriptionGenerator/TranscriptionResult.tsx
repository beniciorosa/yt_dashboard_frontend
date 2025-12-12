import React, { useState, useEffect } from 'react';
import { Download, FileText, Copy, Check, RefreshCw, Save, Loader2, BrainCircuit, ArrowLeft, Edit2 } from 'lucide-react';
import { downloadTextFile, downloadDocFile } from '../../utils/fileHelpers';
import { GeneratedContent } from '../../services/openaiService';

interface DescriptionResultProps {
    text: string;
    data?: GeneratedContent | null;
    onTextChange: (text: string) => void;
    onBack: () => void;
    onEditConfig: () => void;
    onSaveProject: () => Promise<void>;
}

const DescriptionResult: React.FC<DescriptionResultProps> = ({ text, data, onTextChange, onBack, onEditConfig, onSaveProject }) => {
    const [editableText, setEditableText] = useState(text);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setEditableText(text);
    }, [text]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setEditableText(newText);
        onTextChange(newText);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(editableText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        setSaving(true);
        await onSaveProject();
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="w-full flex flex-col lg:flex-row gap-6 h-full max-h-[800px]">

            {/* Main Content - Editable Description */}
            <div className="flex-grow bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <FileText className="text-slate-500 dark:text-slate-400 w-5 h-5" />
                        <h2 className="font-semibold text-slate-700 dark:text-slate-200">Descrição Gerada (Editável)</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saved || saving}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-all hover:shadow-sm ${saved
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : (saved ? <Check size={14} /> : <Save size={14} />)}
                            {saved ? 'Salvo!' : (saving ? 'Salvando...' : 'Salvar Projeto')}
                        </button>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-all hover:shadow-sm"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>

                <textarea
                    value={editableText}
                    onChange={handleTextChange}
                    className="flex-grow p-6 bg-white dark:bg-slate-800 font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-300 resize-none outline-none focus:ring-2 focus:ring-inset focus:ring-green-500/20 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
                    spellCheck={false}
                />

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
                        >
                            <ArrowLeft size={14} />
                            Novo
                        </button>
                        <button
                            onClick={onEditConfig}
                            className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                        >
                            <Edit2 size={14} />
                            Editar Config
                        </button>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => downloadTextFile(editableText, 'descricao-youtube.txt')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all shadow-sm"
                        >
                            <Download size={16} />
                            Baixar .txt
                        </button>
                        <button
                            onClick={() => downloadDocFile(editableText, 'descricao-youtube.doc')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border border-transparent rounded-lg transition-all shadow-sm"
                        >
                            <Download size={16} />
                            Baixar .doc
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar - Rationale (New Style) */}
            {(data?.description_rationale || data?.chapters_rationale) && (
                <div className="w-full lg:w-80 flex-shrink-0 space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                        <h3 className="text-purple-900 dark:text-purple-300 font-semibold mb-4 flex items-center gap-2">
                            <BrainCircuit size={20} /> Insights do Algoritmo
                        </h3>

                        <div className="space-y-6 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-100 dark:scrollbar-thumb-purple-900 pr-2">
                            {data?.description_rationale && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-purple-100 dark:border-purple-800 pb-1">Estratégia da Copy</h4>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                        {data.description_rationale}
                                    </p>
                                </div>
                            )}

                            {data?.chapters_rationale && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-purple-100 dark:border-purple-800 pb-1">Retenção (Capítulos)</h4>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                        {data.chapters_rationale}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DescriptionResult;

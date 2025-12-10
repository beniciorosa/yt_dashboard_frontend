import React from 'react';
import { Download, FileText, Copy, Check, RefreshCw, Save, Loader2 } from 'lucide-react';
import { downloadTextFile, downloadDocFile } from '../../utils/fileHelpers';

interface DescriptionResultProps {
    text: string;
    onBack: () => void;
    onSaveProject: () => Promise<void>;
}

const DescriptionResult: React.FC<DescriptionResultProps> = ({ text, onBack, onSaveProject }) => {
    const [copied, setCopied] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
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
        <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full max-h-[800px] transition-colors">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <FileText className="text-slate-500 dark:text-slate-400 w-5 h-5" />
                    <h2 className="font-semibold text-slate-700 dark:text-slate-200">Descrição Gerada</h2>
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

            <div className="p-6 overflow-y-auto bg-white dark:bg-slate-800 flex-grow font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {text}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                >
                    <RefreshCw size={14} />
                    Gerar nova descrição
                </button>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => downloadTextFile(text, 'descricao-youtube.txt')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all shadow-sm"
                    >
                        <Download size={16} />
                        Baixar .txt
                    </button>
                    <button
                        onClick={() => downloadDocFile(text, 'descricao-youtube.doc')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border border-transparent rounded-lg transition-all shadow-sm"
                    >
                        <Download size={16} />
                        Baixar .doc
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DescriptionResult;

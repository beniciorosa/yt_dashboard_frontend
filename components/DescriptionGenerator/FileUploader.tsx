import React, { useCallback, useState } from 'react';
import { UploadCloud, FileAudio, AlertCircle, X } from 'lucide-react';
import { fileToBase64 } from '../../utils/fileHelpers';

interface FileUploaderProps {
    onFileSelected: (base64: string, mimeType: string, fileName: string, file: File) => void;
    isTranscribing: boolean;
    isLoading?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected, isTranscribing, isLoading = false }) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        if (isLoading || isTranscribing) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, [isLoading, isTranscribing]);

    const validateAndProcessFile = async (file: File) => {
        setError(null);

        if (!file.type.includes('audio') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac)$/i)) {
            setError("Por favor, envie apenas arquivos de áudio (MP3, WAV, M4A, etc).");
            return;
        }

        // 30MB Limit for Server Upload (Cloud Run Hard Limit is 32MB)
        const maxSizeInBytes = 30 * 1024 * 1024;
        if (file.size > maxSizeInBytes) {
            setError("O arquivo excede o limite de 30MB.");
            return;
        }

        try {
            setSelectedFile(file);
            // We still generate base64 purely for potential local playback or legacy handling, 
            // but the main logic will now prefer the File object for upload.
            const base64 = await fileToBase64(file);
            onFileSelected(base64, file.type, file.name, file);
        } catch (err) {
            setError("Erro ao processar o arquivo.");
            console.error(err);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (isLoading || isTranscribing) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndProcessFile(e.dataTransfer.files[0]);
        }
    }, [isLoading, isTranscribing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndProcessFile(e.target.files[0]);
        }
    };

    const clearFile = () => {
        if (isLoading || isTranscribing) return;
        setSelectedFile(null);
        setError(null);
    };

    if (selectedFile) {
        return (
            <div className="w-full p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between animate-fade-in transition-colors">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-600 dark:text-blue-400">
                        <FileAudio size={32} />
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 truncate max-w-[200px] sm:max-w-md">{selectedFile.name}</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-300">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                </div>
                {!isTranscribing && !isLoading && (
                    <button
                        onClick={clearFile}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-full text-blue-500 dark:text-blue-400 transition-colors flex-shrink-0"
                        title="Remover arquivo"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="w-full">
            <label
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
          relative flex flex-col items-center justify-center w-full h-64 
          rounded-2xl border-2 border-dashed transition-all duration-300 
          ${isLoading || isTranscribing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    }
        `}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className={`mb-4 p-4 rounded-full transition-colors ${dragActive ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        <UploadCloud size={40} />
                    </div>
                    <p className="mb-2 text-lg font-semibold text-slate-700 dark:text-slate-200">
                        <span className="font-bold">Clique para enviar</span> ou arraste e solte
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        MP3, WAV, M4A, OGG (Máx. 30MB)
                    </p>
                </div>
                <input
                    type="file"
                    className="hidden"
                    accept="audio/*"
                    onChange={handleChange}
                    disabled={isTranscribing || isLoading}
                />
            </label>

            {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2 text-sm animate-fade-in border border-red-100 dark:border-red-800">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileUploader;

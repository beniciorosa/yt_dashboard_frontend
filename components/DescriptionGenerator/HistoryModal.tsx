import React, { useEffect, useState } from 'react';
import { X, Calendar, Trash2, ArrowRight, FolderOpen, Loader2 } from 'lucide-react';
import { loadProjects, deleteProject, ProjectRow } from '../../services/descriptionStorage';
import ConfirmModal from './ConfirmModal';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadProject: (project: ProjectRow) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onLoadProject }) => {
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

    const fetchProjects = async () => {
        setLoading(true);
        const data = await loadProjects();
        setProjects(data);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchProjects();
        }
    }, [isOpen]);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setProjectToDelete(id);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;

        const success = await deleteProject(projectToDelete);
        if (success) {
            setProjects(prev => prev.filter(p => p.id !== projectToDelete));
        }
        setProjectToDelete(null);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden transition-colors">

                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                            <FolderOpen className="text-blue-600 dark:text-blue-500" />
                            <h2 className="text-xl font-bold">Meus Projetos (Supabase)</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900 flex-grow scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" />
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <p>Nenhum projeto salvo encontrado.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => onLoadProject(project)}
                                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {project.name || project.video_title || 'Sem Título'}
                                                </h3>
                                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {new Date(project.created_at).toLocaleDateString('pt-BR', {
                                                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, project.id)}
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Excluir projeto"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <div className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            <ConfirmModal
                isOpen={!!projectToDelete}
                title="Excluir Projeto"
                message="Tem certeza que deseja excluir este projeto permanentemente?"
                onConfirm={confirmDelete}
                onCancel={() => setProjectToDelete(null)}
                isDestructive={true}
            />
        </>
    );
};

export default HistoryModal;

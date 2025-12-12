// --- START OF FILE components/UpdateForm.tsx ---
import React, { useState } from 'react';
import { X, PlusCircle, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  competitorName?: string;
}

export const UpdateForm: React.FC<Props> = ({ onClose, onSave, competitorName }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-CA'), // Default today local YYYY-MM-DD
    subscribers: '',
    videos: '',
    views: ''
  });

  const parseFormattedNumber = (value: string): number => {
    // Remove everything that is not a digit
    const cleaned = value.replace(/\D/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        date: formData.date, // Pass YYYY-MM-DD directly
        subscribers: parseFormattedNumber(formData.subscribers),
        videos: parseFormattedNumber(formData.videos),
        views: parseFormattedNumber(formData.views)
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50 dark:bg-gray-750 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Atualizar: <span className="text-indigo-600 dark:text-indigo-400">{competitorName || 'Estatísticas'}</span>
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Coleta</label>
              <input required type="date" className={inputClass}
                value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inscritos Atuais</label>
              <input required type="text" placeholder="ex: 1.200.000" className={inputClass}
                value={formData.subscribers} onChange={e => setFormData({ ...formData, subscribers: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vídeos Totais</label>
              <input required type="text" placeholder="ex: 500" className={inputClass}
                value={formData.videos} onChange={e => setFormData({ ...formData, videos: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Views Totais</label>
              <input required type="text" placeholder="ex: 15.000.000" className={inputClass}
                value={formData.views} onChange={e => setFormData({ ...formData, views: e.target.value })} />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
              {isSubmitting ? 'Salvando...' : 'Registrar Atualização'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- START OF FILE components/CompetitorForm.tsx ---
import React, { useState } from 'react';
import { X, Save, Loader2, Wand2 } from 'lucide-react';
import { fetchYoutubeChannelData } from '../services/youtubeService';

interface Props {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const CompetitorForm: React.FC<Props> = ({ onClose, onSave }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // State to hold the real YouTube Channel ID (UC...)
  const [realChannelId, setRealChannelId] = useState<string | null>(null);
  const [fetchedAvatar, setFetchedAvatar] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    channelName: '',
    influencerName: '',
    channelUrl: '',
    country: '',
    youtubeJoinDate: '',
    subscribers: '',
    videos: '',
    views: '',
    isMyChannel: false
  });

  const parseFormattedNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    const cleaned = value.replace(/\D/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handleFetchFromApi = async () => {
    if (!formData.channelUrl) {
      alert("Por favor, insira o Link ou Handle (@) do canal primeiro.");
      return;
    }

    setIsFetching(true);
    try {
      const { competitor, stats, avatarUrl } = await fetchYoutubeChannelData(formData.channelUrl);
      
      // Save the real ID and Avatar to state
      if (competitor.id) setRealChannelId(competitor.id);
      if (avatarUrl) setFetchedAvatar(avatarUrl);

      setFormData(prev => ({
        ...prev,
        channelName: competitor.channelName || prev.channelName,
        influencerName: competitor.influencerName || prev.influencerName,
        country: competitor.country || 'BR',
        youtubeJoinDate: competitor.youtubeJoinDate || prev.youtubeJoinDate,
        subscribers: stats.subscribers.toString(),
        videos: stats.videos.toString(),
        views: stats.views.toString()
      }));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const initialStats = {
        subscribers: parseFormattedNumber(formData.subscribers),
        videos: parseFormattedNumber(formData.videos),
        views: parseFormattedNumber(formData.views)
      };

      const competitorData = {
        id: realChannelId, // Pass the real ID if available
        channelName: formData.channelName,
        influencerName: formData.influencerName,
        channelUrl: formData.channelUrl,
        avatarUrl: fetchedAvatar, // Pass the avatar URL found via API
        country: formData.country,
        youtubeJoinDate: formData.youtubeJoinDate,
        isMyChannel: formData.isMyChannel
      };

      await onSave({ competitor: competitorData, stats: initialStats });
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar dados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50 dark:bg-gray-750 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Novo Concorrente</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Static Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Dados do Canal</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link do Canal ou @Handle</label>
                <div className="flex gap-2">
                  <input required type="text" className={inputClass} 
                    value={formData.channelUrl} onChange={e => setFormData({...formData, channelUrl: e.target.value})} 
                    placeholder="https://youtube.com/... ou @nome"
                  />
                  <button 
                    type="button" 
                    onClick={handleFetchFromApi}
                    disabled={isFetching}
                    className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 p-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    title="Preencher via API"
                  >
                     {isFetching ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                  </button>
                </div>
              </div>
              
              {fetchedAvatar && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
                      <img src={fetchedAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Avatar encontrado e pronto para salvar!</span>
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Canal</label>
                <input required type="text" className={inputClass} 
                  value={formData.channelName} onChange={e => setFormData({...formData, channelName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Influenciador (Personalizado)</label>
                <input required type="text" className={inputClass} 
                  value={formData.influencerName} onChange={e => setFormData({...formData, influencerName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">País / Região</label>
                <input required type="text" className={inputClass} 
                  value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entrou no YT em</label>
                <input required type="date" className={inputClass} 
                  value={formData.youtubeJoinDate} onChange={e => setFormData({...formData, youtubeJoinDate: e.target.value})} />
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isMyChannel"
                  checked={formData.isMyChannel}
                  onChange={e => setFormData({...formData, isMyChannel: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isMyChannel" className="text-sm font-medium text-gray-900 dark:text-white">
                  Este é o meu canal
                </label>
              </div>
            </div>

            {/* Initial Stats */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Dados Iniciais (Hoje)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inscritos</label>
                <input required type="text" placeholder="ex: 1.000.000" className={inputClass} 
                  value={formData.subscribers} onChange={e => setFormData({...formData, subscribers: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade de Vídeos</label>
                <input required type="text" placeholder="ex: 500" className={inputClass} 
                  value={formData.videos} onChange={e => setFormData({...formData, videos: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total de Visualizações</label>
                <input required type="text" placeholder="ex: 10.000.000" className={inputClass} 
                  value={formData.views} onChange={e => setFormData({...formData, views: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} 
              {isSubmitting ? 'Salvando...' : 'Salvar Concorrente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
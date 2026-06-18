import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Search, X, Check, Video, Loader2 } from 'lucide-react';

export interface VideoLite {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at?: string;
  view_count?: number;
}

interface Props {
  selected: VideoLite[];
  onChange: (videos: VideoLite[]) => void;
}

export const VideoMultiSelect: React.FC<Props> = ({ selected, onChange }) => {
  const [allVideos, setAllVideos] = useState<VideoLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('yt_myvideos')
          .select('video_id, title, thumbnail_url, published_at, view_count')
          .eq('privacy_status', 'public')
          .order('published_at', { ascending: false });
        if (error) throw error;
        setAllVideos((data as VideoLite[]) || []);
      } catch (e) {
        console.error('VideoMultiSelect load', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((v) => v.video_id)), [selected]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? allVideos.filter((v) => v.title?.toLowerCase().includes(q) || v.video_id.toLowerCase().includes(q))
      : allVideos;
    return list.slice(0, 60);
  }, [allVideos, query]);

  const toggle = (v: VideoLite) => {
    if (selectedIds.has(v.video_id)) {
      onChange(selected.filter((s) => s.video_id !== v.video_id));
    } else {
      onChange([...selected, v]);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Video size={18} className="text-blue-600" /> Selecione os vídeos
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {selected.length} selecionado{selected.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* chips dos selecionados */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((v) => (
            <span
              key={v.video_id}
              className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-lg max-w-[260px]"
            >
              <span className="truncate">{v.title || v.video_id}</span>
              <button onClick={() => toggle(v)} className="hover:text-red-500 shrink-0">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* busca */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Buscar por título ou ID do vídeo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white w-full"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {/* lista */}
      <div className="max-h-[22rem] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg">
        {loading && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={18} /> Carregando vídeos...
          </div>
        )}
        {!loading &&
          filtered.map((v) => {
            const isSel = selectedIds.has(v.video_id);
            return (
              <button
                key={v.video_id}
                onClick={() => toggle(v)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isSel ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                }`}
              >
                <div
                  className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center ${
                    isSel ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {isSel && <Check size={14} />}
                </div>
                <div className="w-16 h-9 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 shrink-0">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-100 line-clamp-1">{v.title || v.video_id}</p>
                  <p className="text-[11px] text-gray-400">
                    {v.published_at ? new Date(v.published_at).toLocaleDateString('pt-BR') : ''}
                    {typeof v.view_count === 'number' ? ` · ${v.view_count.toLocaleString('pt-BR')} views` : ''}
                  </p>
                </div>
              </button>
            );
          })}
        {!loading && filtered.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">Nenhum vídeo encontrado.</div>
        )}
      </div>
      {query && allVideos.length > filtered.length && (
        <p className="text-[11px] text-gray-400 mt-2">Mostrando os primeiros {filtered.length} resultados — refine a busca.</p>
      )}
    </div>
  );
};

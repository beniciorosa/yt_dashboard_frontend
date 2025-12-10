
// --- START OF FILE components/Charts.tsx ---
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatSnapshot } from '../types';

interface Props {
  snapshots: StatSnapshot[];
  theme?: 'light' | 'dark';
}

export const StatsChart: React.FC<Props> = ({ snapshots, theme = 'light' }) => {
  // Sort snapshots to ensure chronological order
  const sortedSnapshots = [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate Deltas (Gains per day)
  const data = sortedSnapshots.map((current, index) => {
    if (index === 0) return null; // Skip the first one as we need a previous record to calculate gain

    const prev = sortedSnapshots[index - 1];
    
    // Calculate differences
    const subGain = current.subscribers - prev.subscribers;
    const viewGain = current.views - prev.views;
    const videoGain = current.videos - prev.videos;

    return {
      date: new Date(current.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dateFull: new Date(current.date).toLocaleDateString('pt-BR'),
      "Novos Inscritos": subGain > 0 ? subGain : 0, // Prevent negatives if needed, or keep for corrections
      "Novas Views": viewGain > 0 ? viewGain : 0,
      "Novos Vídeos": videoGain > 0 ? videoGain : 0
    };
  }).filter(Boolean); // Remove the null first entry

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const axisColor = theme === 'dark' ? '#6b7280' : '#9ca3af';
  const gridColor = theme === 'dark' ? '#374151' : '#eee';
  const tooltipBg = theme === 'dark' ? '#1f2937' : '#fff';
  const tooltipText = theme === 'dark' ? '#fff' : '#000';

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl mt-6">
        Precisa de pelo menos 2 registros para calcular o ganho diário.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      
      {/* CHART 1: SUBSCRIBERS GAIN */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
          Novos Inscritos (Diário)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: axisColor}} stroke={axisColor} />
              <YAxis tickFormatter={formatNumber} tick={{fontSize: 12, fill: axisColor}} stroke={axisColor} />
              <Tooltip 
                cursor={{fill: theme === 'dark' ? '#374151' : '#f3f4f6'}}
                formatter={(value: number) => [`+${new Intl.NumberFormat('pt-BR').format(value)}`, 'Inscritos']} 
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: tooltipBg,
                    color: tooltipText
                }} 
              />
              <Bar dataKey="Novos Inscritos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: VIDEO UPLOADS */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
          Frequência de Uploads
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: axisColor}} stroke={axisColor} />
              <YAxis allowDecimals={false} tick={{fontSize: 12, fill: axisColor}} stroke={axisColor} />
              <Tooltip 
                cursor={{fill: theme === 'dark' ? '#374151' : '#f3f4f6'}}
                formatter={(value: number) => [`+${value}`, 'Vídeos']} 
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: tooltipBg,
                    color: tooltipText
                }} 
              />
              <Bar dataKey="Novos Vídeos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 3: VIEWS GAIN */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
          Novas Visualizações
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: axisColor}} stroke={axisColor} />
              <YAxis tickFormatter={formatNumber} tick={{fontSize: 12, fill: axisColor}} stroke={axisColor} />
              <Tooltip 
                cursor={{fill: theme === 'dark' ? '#374151' : '#f3f4f6'}}
                formatter={(value: number) => [`+${new Intl.NumberFormat('pt-BR').format(value)}`, 'Views']} 
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: tooltipBg,
                    color: tooltipText
                }} 
              />
              <Bar dataKey="Novas Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { SalesMetricsDashboard } from './SalesMetricsDashboard';
import { SalesAnalysis } from './SalesAnalysis';
import { LayoutGrid, LineChart } from 'lucide-react';

type Tab = 'overview' | 'analysis';

export const SalesModule: React.FC = () => {
    const [tab, setTab] = useState<Tab>('overview');

    const TabButton = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: any }) => (
        <button
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Sub-navegação (categoria > subcategoria) */}
            <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <TabButton id="overview" label="Visão Geral" icon={LayoutGrid} />
                <TabButton id="analysis" label="Análises" icon={LineChart} />
            </div>

            {tab === 'overview' ? <SalesMetricsDashboard /> : <SalesAnalysis />}
        </div>
    );
};

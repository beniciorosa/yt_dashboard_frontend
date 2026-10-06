import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plug } from 'lucide-react';
import { api, post } from '../lib/api';
import { Badge, Button, Section, useToast } from '../components/ui';

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <label className="block">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full h-9 px-3 rounded-md bg-surface-2 border border-line text-sm text-fg font-mono placeholder:text-fg-subtle"
        />
    </label>
);

const HotmartCard: React.FC = () => {
    const toast = useToast();
    const qc = useQueryClient();
    const status = useQuery({ queryKey: ['hotmart', 'status'], queryFn: () => api<{ configured: boolean }>('/hotmart/status') });
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [basic, setBasic] = useState('');
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const sync = async () => {
        setSyncing(true);
        try {
            // backfill resumível: repete até cobrir todo o histórico
            let total = 0;
            for (let round = 0; round < 40; round++) {
                const s = await api<{ recent: number; backfilled: number; backfillDone: boolean }>('/hotmart/sync');
                total += s.backfilled;
                if (s.backfillDone) break;
            }
            toast(`Hotmart sincronizada (${total} vendas no histórico).`, 'success');
            await qc.invalidateQueries({ queryKey: ['hotmart'] });
            await qc.invalidateQueries({ queryKey: ['sync-status'] });
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setSyncing(false);
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            await post('/hotmart/credentials', { clientId, clientSecret, basic });
            setClientId(''); setClientSecret(''); setBasic('');
            toast('Hotmart conectada. Iniciando a primeira sincronização…', 'success');
            await qc.invalidateQueries({ queryKey: ['hotmart', 'status'] });
            await sync();
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Section
            title="Hotmart"
            description="Vendas do Metrify e dos demais produtos, lidas direto da API. Aparecem no app de vendas do celular, separadas do HubSpot."
            actions={status.data?.configured ? <Badge tone="positive"><CheckCircle2 size={12} /> conectada</Badge> : <Badge>não conectada</Badge>}
        >
            <div className="space-y-3 max-w-lg">
                <p className="text-xs text-fg-muted">
                    Na Hotmart: <span className="text-fg">Ferramentas → Credenciais de desenvolvedor → Criar credencial</span> (tipo produção).
                    Cole os três valores gerados; eles ficam guardados só no servidor.
                </p>
                <Field label="Client ID" value={clientId} onChange={setClientId} />
                <Field label="Client Secret" value={clientSecret} onChange={setClientSecret} />
                <Field label="Basic" value={basic} onChange={setBasic} placeholder="Basic …" />
                <div className="flex gap-2">
                    <Button variant="primary" icon={<Plug size={14} />} onClick={save} disabled={!clientId || !clientSecret || !basic} loading={saving}>
                        {status.data?.configured ? 'Trocar credenciais e sincronizar' : 'Conectar e sincronizar'}
                    </Button>
                    {status.data?.configured && <Button onClick={sync} loading={syncing}>Sincronizar agora</Button>}
                </div>
            </div>
        </Section>
    );
};

export const IntegrationsPage: React.FC = () => (
    <div className="space-y-5 max-w-4xl">
        <HotmartCard />
        <Section title="HubSpot" description="Conexão e sincronização ficam em Receita → Closers.">
            <p className="text-sm text-fg-muted">Negócios, vendedores, estágios e produtos (itens de linha) sincronizam a cada 30 minutos.</p>
        </Section>
    </div>
);

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, Instagram, Youtube, Twitter, MessageCircle, LayoutTemplate, ArrowDownUp, Save, FolderDown, Check, X, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import {
    loadCtaPresets, saveCtaPreset, updateCtaPreset, deleteCtaPreset,
    loadSocialPresets, saveSocialPreset, updateSocialPreset, deleteSocialPreset,
    listCustomLinkPresets, saveCustomLinksPreset, updateCustomLinksPreset, loadCustomLinksPreset, deleteCustomLinksPreset,
    Preset
} from '../../services/descriptionStorage';
import ConfirmModal from './ConfirmModal';

export interface LinkItem {
    id: string;
    title: string;
    url: string;
    position: 'top' | 'bottom';
}

export interface SocialItem {
    id: string;
    network: 'Instagram' | 'YouTube' | 'X' | 'TikTok';
    url: string;
    enabled: boolean;
}

export type CtaPosition = 'top' | 'middle' | 'bottom';

export interface DescriptionConfigData {
    videoTitle: string;
    ctaText: string;
    ctaUrl: string;
    ctaPosition: CtaPosition;
    links: LinkItem[];
    socials: SocialItem[];
}

interface ConfigurationFormProps {
    config: DescriptionConfigData;
    onChange: (newConfig: DescriptionConfigData) => void;
}

// --- Generic Preset Manager (CTA, Sociais, Links) ---

interface PresetManagerProps {
    label: string;
    fetchPresets: () => Promise<Preset[]>;
    onSave: (name: string) => Promise<boolean>;
    onUpdate: (id: string) => Promise<boolean>;
    onDelete: (key: string) => Promise<boolean>;
    onSelect: (preset: Preset) => Promise<void> | void;
    activePreset: Preset | null;
    deleteKey?: 'id' | 'name';
    onClearActive?: () => void;
}

const PresetManager: React.FC<PresetManagerProps> = ({
    label, fetchPresets, onSave, onUpdate, onDelete, onSelect, activePreset, deleteKey = 'id', onClearActive
}) => {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [showLoad, setShowLoad] = useState(false);
    const [isNaming, setIsNaming] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [loading, setLoading] = useState(false);

    // Confirm Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);

    const loadList = async () => {
        setLoading(true);
        const list = await fetchPresets();
        setPresets(list);
        setLoading(false);
    };

    useEffect(() => {
        if (showLoad) {
            loadList();
        }
    }, [showLoad]);

    const startSave = () => {
        setPresetName('');
        setIsNaming(true);
    };

    const cancelSave = () => {
        setIsNaming(false);
        setPresetName('');
    };

    const confirmSave = async () => {
        if (!presetName.trim()) return;
        setLoading(true);
        const success = await onSave(presetName);
        if (success) {
            setIsNaming(false);
            setPresetName('');
            if (showLoad) loadList();
        }
        setLoading(false);
    };

    const handleSelect = async (preset: Preset) => {
        setLoading(true);
        await onSelect(preset);
        setLoading(false);
        setShowLoad(false);
    };

    const handleUpdate = async () => {
        if (!activePreset) return;
        setLoading(true);
        const key = deleteKey === 'name' ? activePreset.name : activePreset.id;
        const success = await onUpdate(key);
        if (!success) {
            console.error("Failed to update preset");
        }
        setLoading(false);
    };

    const confirmDelete = async () => {
        if (!activePreset) return;
        setConfirmOpen(false);
        setLoading(true);
        const key = deleteKey === 'name' ? activePreset.name : activePreset.id;
        const success = await onDelete(key);
        if (success) {
            await loadList();
            // Clear active state AND form data via parent callback
            onClearActive?.();
        }
        setLoading(false);
    };

    // Se estamos nomeando (Salvar Novo)
    if (isNaming) {
        return (
            <div className="flex items-center gap-1 animate-in fade-in duration-200">
                <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Nome..."
                    className="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmSave();
                        if (e.key === 'Escape') cancelSave();
                    }}
                />
                <button
                    onClick={confirmSave}
                    disabled={loading}
                    className="p-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/60 disabled:opacity-50"
                >
                    <Check size={14} />
                </button>
                <button
                    onClick={cancelSave}
                    className="p-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/60"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-sm relative ml-auto">
                {/* Load Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowLoad(!showLoad)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all border shadow-sm text-xs font-medium ${showLoad
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <FolderDown size={14} />}
                        Carregar
                    </button>

                    {showLoad && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowLoad(false)}></div>
                            <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 max-h-60 overflow-y-auto">
                                {presets.length === 0 && !loading ? (
                                    <div className="px-4 py-3 text-slate-400 text-xs text-center italic">Nenhum modelo salvo</div>
                                ) : (
                                    presets.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleSelect(p)}
                                            className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer px-4 py-2.5 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Settings2 size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                                                <span className="truncate text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 text-sm font-medium">{p.name}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Save Button */}
                <button
                    onClick={startSave}
                    className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 bg-white dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1.5 rounded-md transition-all border border-slate-200 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 shadow-sm text-xs font-medium"
                >
                    <Save size={14} />
                    Salvar
                </button>
            </div>

            {/* Management Bar (Active Preset) */}
            {activePreset && (
                <div className="w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 mt-1 animate-in fade-in slide-in-from-top-1 shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden mr-2 pl-1">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate tracking-wide" title={activePreset.name}>
                            {activePreset.name}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-md transition-all"
                            title="Salvar alterações neste modelo"
                        >
                            <RefreshCw size={12} />
                            Atualizar
                        </button>
                        <button
                            onClick={() => setConfirmOpen(true)}
                            disabled={loading}
                            className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-md transition-all"
                            title="Excluir modelo permanentemente"
                        >
                            <Trash2 size={12} />
                            Deletar
                        </button>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmOpen}
                title="Excluir Modelo"
                message={`Tem certeza que deseja excluir o modelo "${activePreset?.name}"? Esta ação limpará os dados da tela e não pode ser desfeita.`}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
                isDestructive={true}
            />
        </div>
    );
};


const ConfigurationForm: React.FC<ConfigurationFormProps> = ({ config, onChange }) => {
    // State to track active presets
    const [activeCtaPreset, setActiveCtaPreset] = useState<Preset | null>(null);
    const [activeSocialPreset, setActiveSocialPreset] = useState<Preset | null>(null);
    const [activeLinkPreset, setActiveLinkPreset] = useState<Preset | null>(null);

    const updateField = (field: keyof DescriptionConfigData, value: any) => {
        onChange({ ...config, [field]: value });
    };

    // Links Logic
    const addLink = () => {
        const newLink: LinkItem = {
            id: Math.random().toString(36).substr(2, 9),
            title: '',
            url: '',
            position: 'bottom'
        };
        updateField('links', [...config.links, newLink]);
    };

    const removeLink = (id: string) => {
        updateField('links', config.links.filter(l => l.id !== id));
    };

    const updateLink = (id: string, field: keyof LinkItem, value: string) => {
        updateField('links', config.links.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    // Socials Logic
    const toggleSocial = (id: string) => {
        updateField('socials', config.socials.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    };

    const updateSocialUrl = (id: string, url: string) => {
        updateField('socials', config.socials.map(s => s.id === id ? { ...s, url } : s));
    };

    const getSocialIcon = (network: string) => {
        switch (network) {
            case 'Instagram': return Instagram;
            case 'YouTube': return Youtube;
            case 'X': return Twitter;
            default: return MessageCircle;
        }
    };

    const getSocialPlaceholder = (network: string) => {
        switch (network) {
            case 'Instagram': return 'seu_usuario (Ex: dhiegorosa)';
            case 'YouTube': return 'seu_usuario (Ex: eudhiego)';
            case 'X': return 'seu_usuario (Ex: dhirosa)';
            case 'TikTok': return 'seu_usuario';
            default: return 'seu_usuario';
        }
    };

    return (
        <div className="w-full space-y-8 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative z-0 transition-colors">

            {/* Section: Title */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <LayoutTemplate size={20} className="text-blue-600 dark:text-blue-500" />
                    1. Título do Vídeo
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Palavras-chave do título serão usadas no início da descrição para SEO.
                </p>
                <input
                    type="text"
                    value={config.videoTitle}
                    onChange={(e) => updateField('videoTitle', e.target.value)}
                    placeholder="Ex: Como vender no Mercado Livre em 2026 começando do zero"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
                />
            </div>

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* Section: CTA */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-grow">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <MessageCircle size={20} className="text-green-600 dark:text-green-500" />
                            2. Chamada para Ação (CTA)
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Um convite especial ou link estratégico.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-md border border-slate-300 dark:border-slate-600 shadow-sm mb-1">
                            <ArrowDownUp size={14} className="text-slate-500 dark:text-slate-400 ml-1" />
                            <select
                                value={config.ctaPosition}
                                onChange={(e) => updateField('ctaPosition', e.target.value)}
                                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none px-1 cursor-pointer"
                            >
                                <option value="top" className="dark:bg-slate-800">Topo (Início)</option>
                                <option value="middle" className="dark:bg-slate-800">Acima dos Capítulos</option>
                                <option value="bottom" className="dark:bg-slate-800">Abaixo dos Capítulos</option>
                            </select>
                        </div>
                        <PresetManager
                            label="CTA"
                            fetchPresets={loadCtaPresets}
                            onSave={(name) => saveCtaPreset(name, config.ctaText, config.ctaUrl, config.ctaPosition)}
                            onUpdate={(id) => updateCtaPreset(id, config.ctaText, config.ctaUrl, config.ctaPosition)}
                            onDelete={deleteCtaPreset}
                            activePreset={activeCtaPreset}
                            onSelect={(preset) => {
                                setActiveCtaPreset(preset);
                                onChange({
                                    ...config,
                                    ctaText: preset.data.ctaText || '',
                                    ctaUrl: preset.data.ctaUrl || '',
                                    ctaPosition: preset.data.ctaPosition || 'top'
                                });
                            }}
                            onClearActive={() => {
                                setActiveCtaPreset(null);
                                onChange({
                                    ...config,
                                    ctaText: '',
                                    ctaUrl: '',
                                    ctaPosition: 'top'
                                });
                            }}
                        />
                    </div>
                </div>

                <div className="grid gap-3">
                    <input
                        type="text"
                        value={config.ctaText}
                        onChange={(e) => updateField('ctaText', e.target.value)}
                        placeholder="Texto da chamada (Ex: Inscreva-se na Masterclass)"
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <input
                        type="text"
                        value={config.ctaUrl}
                        onChange={(e) => updateField('ctaUrl', e.target.value)}
                        placeholder="Link do CTA (https://...)"
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono placeholder-slate-400 dark:placeholder-slate-500"
                    />
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* Section: Socials */}
            <div className="space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Instagram size={20} className="text-pink-600 dark:text-pink-500" />
                            3. Redes Sociais
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Digite apenas o seu nome de usuário (sem @ ou link).
                        </p>
                    </div>

                    <PresetManager
                        label="Sociais"
                        fetchPresets={loadSocialPresets}
                        onSave={(name) => saveSocialPreset(name, config.socials)}
                        onUpdate={(id) => updateSocialPreset(id, config.socials)}
                        onDelete={deleteSocialPreset}
                        activePreset={activeSocialPreset}
                        onSelect={(preset) => {
                            setActiveSocialPreset(preset);
                            updateField('socials', preset.data);
                        }}
                        onClearActive={() => {
                            setActiveSocialPreset(null);
                            // Reset all socials to disabled and empty
                            const resetSocials = config.socials.map(s => ({ ...s, url: '', enabled: false }));
                            updateField('socials', resetSocials);
                        }}
                    />
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                    {config.socials.map((social) => {
                        const Icon = getSocialIcon(social.network);
                        return (
                            <button
                                key={social.id}
                                onClick={() => toggleSocial(social.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${social.enabled
                                        ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 shadow-md'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <Icon size={16} />
                                {social.network}
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-3">
                    {config.socials.filter(s => s.enabled).map((social) => {
                        const Icon = getSocialIcon(social.network);
                        return (
                            <div key={social.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 flex-shrink-0">
                                    <Icon size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={social.url}
                                    onChange={(e) => updateSocialUrl(social.id, e.target.value)}
                                    placeholder={getSocialPlaceholder(social.network)}
                                    className="flex-grow px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-slate-400 dark:placeholder-slate-500"
                                />
                            </div>
                        );
                    })}
                    {config.socials.every(s => !s.enabled) && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nenhuma rede social selecionada.</p>
                    )}
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* Section: Custom Links */}
            <div className="space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <LinkIcon size={20} className="text-amber-600 dark:text-amber-500" />
                            4. Links Personalizados
                        </h3>
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                        <PresetManager
                            label="Links"
                            fetchPresets={listCustomLinkPresets}
                            onSave={(name) => saveCustomLinksPreset(name, config.links)}
                            onUpdate={(name) => updateCustomLinksPreset(name, config.links)}
                            onDelete={deleteCustomLinksPreset}
                            activePreset={activeLinkPreset}
                            deleteKey="name"
                            onSelect={async (preset) => {
                                setActiveLinkPreset(preset);
                                const links = await loadCustomLinksPreset(preset.name);
                                updateField('links', links);
                            }}
                            onClearActive={() => {
                                setActiveLinkPreset(null);
                                updateField('links', []);
                            }}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={addLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800"
                    >
                        <Plus size={14} />
                        Adicionar Link
                    </button>
                </div>

                <div className="space-y-3">
                    {config.links.map((link) => (
                        <div key={link.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={link.title}
                                    onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                                    placeholder="Título (Ex: Meu Curso)"
                                    className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                                />
                                <input
                                    type="text"
                                    value={link.url}
                                    onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                                    placeholder="URL (https://...)"
                                    className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono placeholder-slate-400 dark:placeholder-slate-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={link.position}
                                    onChange={(e) => updateLink(link.id, 'position', e.target.value)}
                                    className="px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                                >
                                    <option value="bottom" className="dark:bg-slate-800">Em Links Importantes</option>
                                    <option value="top" className="dark:bg-slate-800">No Topo (Destaque)</option>
                                </select>
                                <button
                                    onClick={() => removeLink(link.id)}
                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    title="Remover link"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {config.links.length === 0 && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nenhum link extra adicionado.</p>
                    )}
                </div>
            </div>

        </div>
    );
};

export default ConfigurationForm;

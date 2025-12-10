import { supabase } from './descriptionSupabaseClient';
import { SocialItem, LinkItem } from '../components/DescriptionGenerator/ConfigurationForm';

// Interfaces matching Supabase Tables

export interface ProjectRow {
    id: string;
    name: string;
    video_title: string;
    final_description: string;
    created_at: string;
    user_id?: string;
}

export interface CtaPresetRow {
    id: string;
    preset_name: string;
    text: string;
    url: string;
    position: string;
    user_id?: string;
}

export interface SocialPresetRow {
    id: string;
    preset_name: string;
    instagram_username: string | null;
    x_username: string | null;
    youtube_username: string | null;
    tiktok_username: string | null;
    user_id?: string;
}

export interface CustomLinkRow {
    id: string;
    preset_name: string;
    title: string;
    url: string;
    position: string;
    order_index: number;
    user_id?: string;
}

// Generic Preset Interface for UI
export interface Preset {
    id: string;
    name: string;
    data: any; // Payload to load back into forms
}

// Helper: Get or Create Anonymous User ID
const getUserId = (): string => {
    const STORAGE_KEY = 'youtube_desc_app_user_id';
    let userId = localStorage.getItem(STORAGE_KEY);

    if (!userId) {
        // Generate simple UUID v4-like string
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            userId = crypto.randomUUID();
        } else {
            userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        localStorage.setItem(STORAGE_KEY, userId);
    }
    return userId;
};

// --- PROJECTS ---

export const saveProject = async (videoTitle: string, finalDescription: string): Promise<ProjectRow | null> => {
    try {
        const userId = getUserId();
        const { data, error } = await supabase
            .from('projects')
            .insert({
                user_id: userId,
                name: videoTitle || 'Projeto Sem Título',
                video_title: videoTitle,
                final_description: finalDescription,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Erro ao salvar projeto:', JSON.stringify(err, null, 2));
        return null;
    }
};

export const loadProjects = async (): Promise<ProjectRow[]> => {
    try {
        // Removed user_id filter to allow seeing all projects in dev/test mode
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Erro ao carregar projetos:', JSON.stringify(err, null, 2));
        return [];
    }
};

export const deleteProject = async (id: string): Promise<boolean> => {
    try {
        // Removed user_id filter
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao deletar projeto:', JSON.stringify(err, null, 2));
        return false;
    }
};

// --- CTA PRESETS ---

export const saveCtaPreset = async (presetName: string, text: string, url: string, position: string): Promise<boolean> => {
    try {
        const userId = getUserId();
        const { error } = await supabase
            .from('cta_presets')
            .insert({
                user_id: userId,
                preset_name: presetName,
                text,
                url,
                position,
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao salvar CTA:', JSON.stringify(err, null, 2));
        return false;
    }
};

export const updateCtaPreset = async (id: string, text: string, url: string, position: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('cta_presets')
            .update({
                text,
                url,
                position
            })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao atualizar CTA:', JSON.stringify(err, null, 2));
        return false;
    }
};

export const loadCtaPresets = async (): Promise<Preset[]> => {
    try {
        // Removed user_id filter
        const { data, error } = await supabase
            .from('cta_presets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map to generic Preset format for UI
        return (data || []).map((row: CtaPresetRow) => ({
            id: row.id,
            name: row.preset_name,
            data: {
                ctaText: row.text,
                ctaUrl: row.url,
                ctaPosition: row.position
            }
        }));
    } catch (err) {
        console.error('Erro ao carregar CTAs:', JSON.stringify(err, null, 2));
        return [];
    }
};

export const deleteCtaPreset = async (id: string): Promise<boolean> => {
    try {
        // Removed user_id filter
        const { error } = await supabase
            .from('cta_presets')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao deletar CTA:', JSON.stringify(err, null, 2));
        return false;
    }
};

// --- SOCIAL PRESETS ---

export const saveSocialPreset = async (
    presetName: string,
    socials: SocialItem[]
): Promise<boolean> => {
    try {
        const userId = getUserId();
        const getUrl = (network: string) => socials.find(s => s.network === network && s.enabled)?.url || null;

        const { error } = await supabase
            .from('social_presets')
            .insert({
                user_id: userId,
                preset_name: presetName,
                instagram_username: getUrl('Instagram'),
                x_username: getUrl('X'),
                youtube_username: getUrl('YouTube'),
                tiktok_username: getUrl('TikTok'),
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao salvar Redes Sociais:', JSON.stringify(err, null, 2));
        return false;
    }
};

export const updateSocialPreset = async (
    id: string,
    socials: SocialItem[]
): Promise<boolean> => {
    try {
        const getUrl = (network: string) => socials.find(s => s.network === network && s.enabled)?.url || null;

        const { error } = await supabase
            .from('social_presets')
            .update({
                instagram_username: getUrl('Instagram'),
                x_username: getUrl('X'),
                youtube_username: getUrl('YouTube'),
                tiktok_username: getUrl('TikTok'),
            })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao atualizar Redes Sociais:', JSON.stringify(err, null, 2));
        return false;
    }
};

export const loadSocialPresets = async (): Promise<Preset[]> => {
    try {
        // Removed user_id filter
        const { data, error } = await supabase
            .from('social_presets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((row: SocialPresetRow) => {
            // Reconstruct the SocialItem[] array
            const socials: SocialItem[] = [
                { id: 'insta', network: 'Instagram', url: row.instagram_username || '', enabled: !!row.instagram_username },
                { id: 'x', network: 'X', url: row.x_username || '', enabled: !!row.x_username },
                { id: 'youtube', network: 'YouTube', url: row.youtube_username || '', enabled: !!row.youtube_username },
                { id: 'tiktok', network: 'TikTok', url: row.tiktok_username || '', enabled: !!row.tiktok_username },
            ];

            return {
                id: row.id,
                name: row.preset_name,
                data: socials // This is what will be passed to onLoad
            };
        });
    } catch (err) {
        console.error('Erro ao carregar Redes Sociais:', JSON.stringify(err, null, 2));
        return [];
    }
};

export const deleteSocialPreset = async (id: string): Promise<boolean> => {
    try {
        // Removed user_id filter
        const { error } = await supabase
            .from('social_presets')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao deletar Redes Sociais:', JSON.stringify(err, null, 2));
        return false;
    }
};

// --- CUSTOM LINKS PRESETS ---

export const saveCustomLinksPreset = async (presetName: string, links: LinkItem[]): Promise<boolean> => {
    try {
        const userId = getUserId();
        // Prepare rows with user_id
        const rows = links.map((link, index) => ({
            user_id: userId,
            preset_name: presetName,
            title: link.title,
            url: link.url,
            position: link.position,
            order_index: index,
        }));

        const { error } = await supabase
            .from('custom_links')
            .insert(rows);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao salvar Links:', JSON.stringify(err, null, 2));
        return false;
    }
};

export const updateCustomLinksPreset = async (presetName: string, links: LinkItem[]): Promise<boolean> => {
    try {
        const userId = getUserId();
        // Strategy: Delete old rows by preset_name and insert new ones

        // 1. Delete
        const { error: deleteError } = await supabase
            .from('custom_links')
            .delete()
            .eq('preset_name', presetName);

        if (deleteError) throw deleteError;

        // 2. Insert
        const rows = links.map((link, index) => ({
            user_id: userId,
            preset_name: presetName,
            title: link.title,
            url: link.url,
            position: link.position,
            order_index: index,
        }));

        const { error: insertError } = await supabase
            .from('custom_links')
            .insert(rows);

        if (insertError) throw insertError;

        return true;
    } catch (err) {
        console.error('Erro ao atualizar Links:', JSON.stringify(err, null, 2));
        return false;
    }
};

export const listCustomLinkPresets = async (): Promise<Preset[]> => {
    try {
        // Removed user_id filter
        const { data, error } = await supabase
            .from('custom_links')
            .select('preset_name, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by preset_name manually
        const uniqueNames = new Set<string>();
        const presets: Preset[] = [];

        (data || []).forEach((row: any) => {
            if (!uniqueNames.has(row.preset_name)) {
                uniqueNames.add(row.preset_name);
                presets.push({
                    id: row.preset_name, // Use name as ID
                    name: row.preset_name,
                    data: null
                });
            }
        });

        return presets;
    } catch (err) {
        console.error('Erro ao listar presets de links:', JSON.stringify(err, null, 2));
        return [];
    }
};

export const loadCustomLinksPreset = async (presetName: string): Promise<LinkItem[]> => {
    try {
        // Removed user_id filter
        const { data, error } = await supabase
            .from('custom_links')
            .select('*')
            .eq('preset_name', presetName)
            .order('order_index', { ascending: true });

        if (error) throw error;

        return (data || []).map((row: CustomLinkRow) => ({
            id: row.id,
            title: row.title,
            url: row.url,
            position: row.position as 'top' | 'bottom'
        }));
    } catch (err) {
        console.error('Erro ao carregar detalhes dos links:', JSON.stringify(err, null, 2));
        return [];
    }
};

export const deleteCustomLinksPreset = async (presetName: string): Promise<boolean> => {
    console.log('[DELETE PRESET] Tentando apagar preset de links:', presetName);

    try {
        // Removed user_id filter to fix "can't delete" issue
        const { error } = await supabase
            .from('custom_links')
            .delete()
            .eq('preset_name', presetName);

        if (error) {
            console.error('[DELETE PRESET] Erro ao apagar preset de links', error);
            throw error;
        }

        console.log('[DELETE PRESET] Preset apagado com sucesso:', presetName);
        return true;
    } catch (err) {
        console.error('[DELETE PRESET] Exception:', err);
        return false;
    }
};

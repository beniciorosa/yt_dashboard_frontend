import { createClient } from '@supabase/supabase-js';

// Helper to safe access env vars in Vite environment to avoid TS errors
const getEnv = (key: string, fallback: string) => {
    try {
        // @ts-ignore
        return import.meta.env[key] || fallback;
    } catch (e) {
        return fallback;
    }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://xsqpqdjffjqxdcmoytfc.supabase.co');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_sh61Cu1Z0OBSEeD0hgzt8A_JQewGsae');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

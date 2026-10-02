import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qytuhvqggsleohxndtqz.supabase.co';
// Chave pública (publishable): o acesso real é decidido pelo RLS com a sessão do usuário
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sh61Cu1Z0OBSEeD0hgzt8A_JQewGsae';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
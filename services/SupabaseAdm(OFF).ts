// --- START OF FILE services/supabaseAdm.ts ---
import { createClient } from '@supabase/supabase-js';

// Configuration for Auth Database (Login Screen)
const SUPABASE_URL = 'https://qytuhvqggsleohxndtqz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dHVodnFnZ3NsZW9oeG5kdHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcwODIxNSwiZXhwIjoyMDc5Mjg0MjE1fQ.5liB1hAHSCezVFRQvlIL7rnPfMrVQKv17dte09bXzb4';

// Use memory storage to avoid browser blocking in sandboxes
const memoryStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => { },
  removeItem: (key: string) => { },
};

export const supabaseAdm = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: memoryStorage
  }
});
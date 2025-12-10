// --- START OF FILE services/supabaseClient.ts ---
import { createClient } from '@supabase/supabase-js';

// Configuration - RESTORED ORIGINAL CREDENTIALS
// Project ID: qytuhvqggsleohxndtqz
const SUPABASE_URL = 'https://qytuhvqggsleohxndtqz.supabase.co';
// Chave Service Role original (para acesso total)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dHVodnFnZ3NsZW9oeG5kdHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcwODIxNSwiZXhwIjoyMDc5Mjg0MjE1fQ.5liB1hAHSCezVFRQvlIL7rnPfMrVQKv17dte09bXzb4';

// Use memory storage to avoid browser blocking in sandboxes
const memoryStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: memoryStorage
  }
});
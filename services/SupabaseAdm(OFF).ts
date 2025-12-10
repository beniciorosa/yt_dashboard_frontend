// --- START OF FILE services/supabaseAdm.ts ---
import { createClient } from '@supabase/supabase-js';

// Configuration for Auth Database (Login Screen)
const SUPABASE_URL = 'https://xsqpqdjffjqxdcmoytfc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcXBxZGpmZmpxeGRjbW95dGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzUxMjIwMywiZXhwIjoyMDc5MDg4MjAzfQ.QmSMnUA2x5AkhN_je20lcAb889-DnSyT-8w3dSQhsWM';

// Use memory storage to avoid browser blocking in sandboxes
const memoryStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
};

export const supabaseAdm = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: memoryStorage
  }
});
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qytuhvqggsleohxndtqz.supabase.co';
// Use the PUBLIC ANON KEY for general frontend use
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dHVodnFnZ3NsZW9oeG5kdHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDgyMTUsImV4cCI6MjA3OTI4NDIxNX0.IBuSVE4yYKLFvx6pXkNDt1132p7d3wTJN4lE_FsBH84';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
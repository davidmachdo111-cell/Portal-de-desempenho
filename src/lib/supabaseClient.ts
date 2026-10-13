import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Cliente Supabase conectado com fallback gracioso caso as credenciais não estejam definidas
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://mock-portal-desempenho.supabase.co', 'mock-anon-key', {
      auth: { persistSession: false },
    });

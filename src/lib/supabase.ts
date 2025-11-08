import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Estas variables DEBEN existir en Vercel (.env) y en tu entorno local
// VITE_SUPABASE_URL: URL del proyecto Supabase
// VITE_SUPABASE_ANON_KEY: anon public key de Supabase

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Configúralas en las Environment Variables de Vercel y en tu entorno local.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

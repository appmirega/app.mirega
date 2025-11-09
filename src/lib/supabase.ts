import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Soportar ambos nombres de variables para evitar errores:
// - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (recomendado)
// - VITE_DATABASE_URL / VITE_DATABASE_ANON_KEY (lo que tienes ahora en Vercel)

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_DATABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_DATABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno para Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY o VITE_DATABASE_URL y VITE_DATABASE_ANON_KEY en Vercel.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

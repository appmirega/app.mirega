import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Estas dos vienen de Vercel y ya las tienes configuradas
const supabaseUrl = import.meta.env.VITE_DATABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_DATABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_DATABASE_URL o VITE_DATABASE_ANON_KEY. Configúralas en las variables de entorno de Vercel.'
  );
}

// Cliente para usar en el frontend
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

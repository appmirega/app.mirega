import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_DATABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_DATABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_DATABASE_URL o VITE_DATABASE_ANON_KEY. Configúralas en tus variables de entorno.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

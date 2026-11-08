import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Checks if Supabase credentials are configured in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-anon-key')
  );
}

/**
 * Singleton Supabase client instance.
 * If credentials are not yet configured, creates a placeholder client that logs informative warnings.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Tests connection to the Supabase instance.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  configured: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      configured: false,
      message: 'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.',
    };
  }

  try {
    const { data, error } = await supabase.from('vehicles').select('id').limit(1);
    if (error) {
      // Table might not exist yet if migrations haven't run
      if (error.code === '42P01') {
        return {
          connected: true,
          configured: true,
          message: 'Conectado ao Supabase com sucesso! Tabelas ainda não criadas. Execute o script de migrations.',
        };
      }
      return {
        connected: false,
        configured: true,
        message: `Erro na resposta do Supabase: ${error.message} (Código: ${error.code})`,
      };
    }
    return {
      connected: true,
      configured: true,
      message: 'Conexão com o Supabase estabelecida com sucesso e tabelas operacionais!',
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      message: `Falha na requisição ao Supabase: ${err.message || String(err)}`,
    };
  }
}

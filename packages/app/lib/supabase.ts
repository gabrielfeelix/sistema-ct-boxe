import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Validação mais robusta com mensagem detalhada
if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('EXPO_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY')

    console.error(
        `[Supabase] ERRO CRÍTICO: Variáveis de ambiente faltando: ${missingVars.join(', ')}\n` +
            `Verifique se o arquivo .env existe em packages/app/ e contém:\n` +
            `  EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co\n` +
            `  EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui\n` +
            `Reinicie o Metro bundler após configurar.`
    )

    throw new Error(
        `[Supabase] Variáveis de ambiente não configuradas: ${missingVars.join(', ')}. ` +
            `Verifique o arquivo .env e reinicie o servidor.`
    )
}

// Log de confirmação em desenvolvimento
if (__DEV__) {
    console.log('[Supabase] ✓ Configurado com sucesso:', {
        url: supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co',
        keyPrefix: supabaseAnonKey.substring(0, 20) + '...',
    })
}

export const isSupabaseConfigured = true

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})

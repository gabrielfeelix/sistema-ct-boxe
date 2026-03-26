import { createClient } from '@supabase/supabase-js'
import { expect, type Locator, type Page } from '@playwright/test'

export const AUTH_FILE = 'tests/e2e/.auth/admin.json'
export const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@ctdoboxe.com.br'
export const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'Ctdoboxe123'

export function uniqueTag(prefix: string) {
    return `${prefix}-${Date.now()}`
}

export async function fillByName(page: Page, fieldName: string, value: string) {
    await page.locator(`[name="${fieldName}"]`).fill(value)
}

export async function expectAnyVisible(...locators: Locator[]) {
    await expect.poll(async () => {
        for (const locator of locators) {
            if (await locator.isVisible().catch(() => false)) {
                return true
            }
        }

        return false
    }).toBe(true)
}

function getServiceRoleClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        return null
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    })
}

export async function cleanupAlunoByEmail(email: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    const { data: alunos } = await supabase.from('alunos').select('id').eq('email', email)
    const ids = (alunos ?? []).map((aluno) => aluno.id)

    if (ids.length === 0) return

    await Promise.allSettled([
        supabase.from('avaliacoes').delete().in('aluno_id', ids),
        supabase.from('presencas').delete().in('aluno_id', ids),
        supabase.from('pagamentos').delete().in('aluno_id', ids),
        supabase.from('aluno_documentos').delete().in('aluno_id', ids),
        supabase.from('contratos').delete().in('aluno_id', ids),
    ])

    await supabase.from('alunos').delete().in('id', ids)
}

export async function seedAluno(input: { nome: string; email: string; telefone: string; cpf?: string }) {
    const supabase = getServiceRoleClient()
    if (!supabase) {
        throw new Error('Service role client not configured for student seed.')
    }

    const { data, error } = await supabase
        .from('alunos')
        .insert({
            nome: input.nome,
            email: input.email,
            telefone: input.telefone,
            cpf: input.cpf ?? null,
            status: 'ativo',
            total_treinos: 0,
            data_cadastro: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single()

    if (error || !data) {
        throw new Error(error?.message ?? 'Failed to seed student.')
    }

    return data.id as string
}

export async function cleanupPostsByPrefix(prefix: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    const { data: posts } = await supabase.from('posts').select('id').ilike('conteudo', `${prefix}%`)
    const ids = (posts ?? []).map((post) => post.id)

    if (ids.length === 0) return

    await Promise.allSettled([
        supabase.from('post_comentarios').delete().in('post_id', ids),
    ])

    await supabase.from('posts').delete().in('id', ids)
}

export async function cleanupEventosByPrefix(prefix: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    await supabase.from('eventos').delete().ilike('titulo', `${prefix}%`)
}

export async function cleanupAulasByPrefix(prefix: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    const { data: aulas } = await supabase.from('aulas').select('id').ilike('titulo', `${prefix}%`)
    const ids = (aulas ?? []).map((aula) => aula.id)

    if (ids.length === 0) return

    await Promise.allSettled([
        supabase.from('presencas').delete().in('aula_id', ids),
    ])

    await supabase.from('aulas').delete().in('id', ids)
}

export async function cleanupContratoModelosByPrefix(prefix: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    await supabase.from('contrato_modelos').delete().ilike('titulo', `${prefix}%`)
}

export async function findContratoModeloByTitle(title: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) {
        throw new Error('Service role client not configured for contract model lookup.')
    }

    const { data, error } = await supabase
        .from('contrato_modelos')
        .select('id,titulo,versao')
        .eq('titulo', title)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function seedPlano(input: {
    nome: string
    valor: number
    descricao?: string
    contrato_modelo_id: string
    recorrencia_intervalo?: number
    recorrencia_unidade?: 'dias' | 'semanas' | 'meses' | 'anos'
}) {
    const supabase = getServiceRoleClient()
    if (!supabase) {
        throw new Error('Service role client not configured for plan seed.')
    }

    const recorrencia_intervalo = input.recorrencia_intervalo ?? 1
    const recorrencia_unidade = input.recorrencia_unidade ?? 'meses'

    const tipo =
        recorrencia_unidade === 'anos' && recorrencia_intervalo === 1
            ? 'anual'
            : recorrencia_unidade === 'meses' && recorrencia_intervalo === 6
              ? 'semestral'
              : recorrencia_unidade === 'meses' && recorrencia_intervalo === 3
                ? 'trimestral'
                : 'mensal'

    const { data, error } = await supabase
        .from('planos')
        .insert({
            nome: input.nome,
            tipo,
            valor: input.valor,
            descricao: input.descricao ?? null,
            ativo: true,
            contrato_modelo_id: input.contrato_modelo_id,
            recorrencia_intervalo,
            recorrencia_unidade,
        })
        .select('id')
        .single()

    if (error || !data) {
        throw new Error(error?.message ?? 'Failed to seed plan.')
    }

    return data.id as string
}

export async function cleanupPlanosByPrefix(prefix: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    await supabase.from('planos').delete().ilike('nome', `${prefix}%`)
}

export async function findPendingDocumentoByAlunoEmail(email: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) {
        throw new Error('Service role client not configured for contract lookup.')
    }

    const { data: aluno } = await supabase.from('alunos').select('id').eq('email', email).maybeSingle()
    if (!aluno?.id) return null

    const { data } = await supabase
        .from('aluno_documentos')
        .select('id, titulo, texto, status, validade')
        .eq('aluno_id', aluno.id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return data ?? null
}

export async function seedCandidato(input: { nome: string; email: string; telefone: string }) {
    const supabase = getServiceRoleClient()
    if (!supabase) {
        throw new Error('Service role client not configured for candidate seed.')
    }

    const { data, error } = await supabase
        .from('candidatos')
        .insert({
            nome: input.nome,
            email: input.email,
            telefone: input.telefone,
            status: 'aguardando',
            experiencia_previa: 'iniciante',
            como_conheceu: 'Instagram',
            tem_condicao_medica: false,
        })
        .select('id')
        .single()

    if (error || !data) {
        throw new Error(error?.message ?? 'Failed to seed candidate.')
    }

    return data.id as string
}

export async function cleanupCandidatoByEmail(email: string) {
    const supabase = getServiceRoleClient()
    if (!supabase) return

    const { data: candidatos } = await supabase.from('candidatos').select('id').eq('email', email)
    const ids = (candidatos ?? []).map((candidato) => candidato.id)

    if (ids.length === 0) return

    await Promise.allSettled([
        supabase.from('avaliacoes').delete().in('candidato_id', ids),
    ])

    await supabase.from('candidatos').delete().in('id', ids)
}

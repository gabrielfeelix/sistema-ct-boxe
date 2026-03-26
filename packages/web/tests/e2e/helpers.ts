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
        supabase.from('contratos').delete().in('aluno_id', ids),
    ])

    await supabase.from('alunos').delete().in('id', ids)
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

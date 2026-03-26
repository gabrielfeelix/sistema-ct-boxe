import { expect, test } from '@playwright/test'
import { cleanupCandidatoByEmail, seedCandidato, uniqueTag } from './helpers'

test('opens a seeded candidate detail page inside the protected area', async ({ page }) => {
    const prefix = uniqueTag('E2E Candidato')
    const nome = `${prefix} Avaliacao`
    const email = `${prefix.toLowerCase().replace(/\s+/g, '-')}@example.com`
    let candidatoId = ''

    try {
        candidatoId = await seedCandidato({
            nome,
            email,
            telefone: '(41) 98888-0000',
        })

        await page.goto(`/candidatos/${candidatoId}`)

        await expect(page).toHaveURL(new RegExp(`/candidatos/${candidatoId}$`))
        await expect(page.getByRole('heading', { name: new RegExp(nome, 'i') })).toBeVisible()
        await expect(page.getByRole('button', { name: /aprovar e matricular/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /avaliação de recrutamento/i })).toBeVisible()
        await expect(page.getByText(/dados do candidato/i)).toBeVisible()
    } finally {
        await cleanupCandidatoByEmail(email)
    }
})

import { expect, test } from '@playwright/test'
import { cleanupAlunoByEmail, fillByName, uniqueTag } from './helpers'

test('creates a student and opens the detail view', async ({ page }) => {
    const tag = uniqueTag('E2E Aluno')
    const nome = `${tag} Cadastro`
    const email = `${tag.toLowerCase().replace(/\s+/g, '-')}@example.com`

    try {
        await page.goto('/alunos')
        await expect(page.getByRole('heading', { level: 2, name: /^alunos$/i })).toBeVisible()

        await page.getByRole('link', { name: /novo aluno/i }).click()
        await page.getByRole('button', { name: /já está matriculado/i }).click()

        await fillByName(page, 'nome', nome)
        await fillByName(page, 'email', email)
        await fillByName(page, 'telefone', '(41) 99999-0000')
        await page.getByRole('button', { name: /cadastrar aluno/i }).click()

        await expect(page.getByRole('heading', { name: /e2e cadastrado!/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /ver perfil do aluno/i })).toBeVisible()
        await page.getByRole('button', { name: /ver perfil do aluno/i }).click()

        await expect(page).toHaveURL(/\/alunos\/.+/)
        await expect(page.getByRole('heading', { name: new RegExp(nome, 'i') })).toBeVisible()
        await expect(page.getByText(/ficha do aluno/i)).toBeVisible()
    } finally {
        await cleanupAlunoByEmail(email)
    }
})

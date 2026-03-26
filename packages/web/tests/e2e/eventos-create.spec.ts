import { expect, test } from '@playwright/test'
import { cleanupEventosByPrefix, uniqueTag } from './helpers'

test('creates an event and shows it on the protected list', async ({ page }) => {
    const prefix = uniqueTag('E2E Evento')
    const titulo = `${prefix} Confraternizacao`

    try {
        await page.goto('/eventos/novo')

        await expect(page.getByRole('heading', { name: /novo evento/i })).toBeVisible()

        await page.getByPlaceholder(/ex\.\: churrasco de confraternização/i).fill(titulo)
        await page.locator('input[type="date"]').fill('2030-12-20')
        await page.getByPlaceholder(/ex\.\: ct argel riboli/i).fill('CT Argel Riboli')
        await page.locator('select').first().selectOption('social')
        await page.getByPlaceholder(/descreva os detalhes do evento/i).fill(
            'Evento automatizado para validar o fluxo protegido de eventos.'
        )
        await page.getByRole('button', { name: /criar evento/i }).click()

        await expect(page).toHaveURL(/\/eventos$/)
        await expect(page.getByRole('heading', { level: 2, name: /^eventos$/i })).toBeVisible()
        await expect(page.getByText(titulo)).toBeVisible()
    } finally {
        await cleanupEventosByPrefix(prefix)
    }
})

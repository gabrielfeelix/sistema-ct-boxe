import { expect, test } from '@playwright/test'
import { cleanupAulasByPrefix, uniqueTag } from './helpers'

test('creates a class and redirects to the protected detail page', async ({ page }) => {
    const prefix = uniqueTag('E2E Aula')
    const titulo = `${prefix} Tecnica`

    try {
        await page.goto('/aulas/nova')

        await expect(page.getByRole('heading', { name: /nova aula/i })).toBeVisible()

        await page.getByPlaceholder(/ex\.\: tecnica de base e deslocamento/i).fill(titulo)
        await page.locator('input[type="date"]').fill('2030-12-21')
        await page.locator('input[type="time"]').nth(0).fill('19:15')
        await page.locator('input[type="time"]').nth(1).fill('20:30')
        await page.getByRole('button', { name: /criar aula/i }).click()

        await expect(page).toHaveURL(/\/aulas\/.+/)
        await expect(page.getByRole('heading', { name: new RegExp(titulo, 'i') })).toBeVisible()
        await expect(page.getByText(/resumo da chamada/i)).toBeVisible()
    } finally {
        await cleanupAulasByPrefix(prefix)
    }
})

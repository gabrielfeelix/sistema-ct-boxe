import { expect, test } from '@playwright/test'

test('loads the authenticated dashboard shell', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /painel de gestão do ct/i })).toBeVisible()
    await expect(page.getByRole('img', { name: /ct de boxe argel riboli/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByText(/alunos ativos/i)).toBeVisible()
})

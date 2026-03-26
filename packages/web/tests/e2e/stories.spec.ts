import { expect, test } from '@playwright/test'
import { expectAnyVisible } from './helpers'

test('loads the stories library screen', async ({ page }) => {
    await page.goto('/stories')

    await expect(page).toHaveURL(/\/stories/)
    await expect(page.getByRole('heading', { name: /biblioteca de videos/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /novo video/i })).toBeVisible()
    await expectAnyVisible(
        page.getByText(/biblioteca vazia/i),
        page.getByText(/videos ativos/i),
        page.getByText(/pasta sem videos vinculados/i),
    )
})

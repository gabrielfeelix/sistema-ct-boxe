import { expect, test } from '@playwright/test'
import { expectAnyVisible } from './helpers'

test('loads the notifications center and rules tab', async ({ page }) => {
    await page.goto('/notificacoes')

    await expect(page).toHaveURL(/\/notificacoes/)
    await expect(page.getByRole('heading', { name: /central de notificações/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^regras$/i })).toBeVisible()

    await page.getByRole('button', { name: /^regras$/i }).click()

    await expectAnyVisible(
        page.getByRole('heading', { name: /alunos/i }),
        page.getByText(/carregando regras/i),
    )
})

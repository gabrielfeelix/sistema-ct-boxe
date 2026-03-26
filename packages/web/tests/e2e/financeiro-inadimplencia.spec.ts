import { expect, test } from '@playwright/test'
import { expectAnyVisible } from './helpers'

test('renders the inadimplencia report for authenticated users', async ({ page }) => {
    await page.goto('/financeiro/inadimplencia')

    await expect(page).toHaveURL(/\/financeiro\/inadimplencia/)
    await expect(page.getByRole('heading', { name: /relatório de inadimplência/i })).toBeVisible()
    await expect(page.getByText(/total em aberto/i)).toBeVisible()
    await expectAnyVisible(
        page.getByText(/fluxo de caixa saudável/i),
        page.getByRole('cell', { name: /atrasado/i }).first(),
    )
})

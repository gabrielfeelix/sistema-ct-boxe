import { expect, test } from '@playwright/test'
import { cleanupPostsByPrefix, uniqueTag } from './helpers'

test('publishes a text-only feed post', async ({ page }) => {
    const prefix = uniqueTag('E2E Feed')
    const conteudo = `${prefix} post automatizado`

    try {
        await page.goto('/feed')
        await expect(page.getByRole('heading', { name: /feed social do ct/i })).toBeVisible()

        await page.getByPlaceholder(/o que há de novo/i).fill(conteudo)
        await page.getByRole('button', { name: /^publicar$/i }).click()

        await expect(page.getByText(conteudo)).toBeVisible()
    } finally {
        await cleanupPostsByPrefix(prefix)
    }
})

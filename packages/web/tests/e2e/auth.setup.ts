import path from 'node:path'
import { expect, test as setup } from '@playwright/test'
import { adminEmail, adminPassword } from './helpers'

setup('authenticate as admin', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill(adminEmail)
    await page.locator('#senha').fill(adminPassword)
    await page.getByRole('button', { name: /entrar/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /painel de gestão do ct/i })).toBeVisible()

    await page.context().storageState({
        path: path.resolve(__dirname, '.auth/admin.json'),
    })
})

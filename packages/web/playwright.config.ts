import path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

dotenv.config({ path: path.resolve(__dirname, '.env.local') })
dotenv.config({ path: path.resolve(__dirname, '.env.e2e'), override: true })

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    use: {
        baseURL,
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: path.resolve(__dirname, 'tests/e2e/.auth/admin.json'),
            },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        command: 'pnpm dev -- --hostname 127.0.0.1 --port 3000',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        cwd: __dirname,
        timeout: 120_000,
    },
})

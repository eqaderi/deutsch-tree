import { createServer } from 'node:net'
import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests run against the built site, compiled from the fixture content
 * in tests/fixtures/content and served the way GitHub Pages serves it: as
 * plain files under /deutsch-tree/.
 *
 * Every run takes a free port, so runs in parallel worktrees never collide.
 * Set BROWSER_TEST_PORT to force one.
 */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() =>
        address && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port')),
      )
    })
  })
}

// Worker processes load this file again; the variable keeps them on the same port.
process.env.BROWSER_TEST_PORT ??= String(await freePort())
const port = process.env.BROWSER_TEST_PORT
const siteUrl = `http://127.0.0.1:${port}/deutsch-tree/`
const siteDir = '.browser-test/site'

export default defineConfig({
  testDir: 'tests/browser',
  testMatch: '**/*.spec.ts',
  outputDir: '.browser-test/results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: siteUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'computer', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm exec vite build --outDir ${siteDir} --emptyOutDir && node tests/browser/serve-site.ts ${siteDir} ${port}`,
    env: { CONTENT_DIR: 'tests/fixtures/content' },
    url: siteUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

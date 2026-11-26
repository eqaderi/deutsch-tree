import { existsSync } from 'node:fs'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildShareFolder } from '../../src/start-files/index.ts'
import { startMacStartFile } from '../start-files/server.ts'
import { test as base, expect } from './test.ts'

/**
 * The app as a learner runs it at home: the folder `pnpm share` writes, from
 * the site and the fixture pack that playwright.config.ts built, started with
 * its Mac start file. The pack is copied into the folder by hand after it was
 * written, so the start file has to find it on its own.
 */
interface StartedFolder {
  url: string
  folder: string
}

const test = base.extend<{ startedFolder: StartedFolder }, { started: StartedFolder }>({
  started: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright reads the fixtures a fixture needs from this pattern.
    async ({}, use) => {
      const root = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-start-files-'))
      const folder = path.join(root, 'deutsch-tree')
      await buildShareFolder({ siteDir: '.browser-test/site', packsDir: path.join(root, 'no-packs'), outDir: folder })
      await cp('.browser-test/packs/fixture-book', path.join(folder, 'app/private/fixture-book'), { recursive: true })

      const server = await startMacStartFile(folder)
      await use({ url: server.url, folder })
      await server.stop()
      await rm(root, { recursive: true, force: true })
    },
    { scope: 'worker' },
  ],
  startedFolder: async ({ started }, use) => use(started),
  baseURL: async ({ started }, use) => use(started.url),
})

test.skip(!existsSync('/usr/bin/perl'), 'The Mac start file needs /usr/bin/perl.')

test('a pack copied into the folder by hand is found when the start file starts the app', async ({ page }) => {
  await page.goto('./#/packs')

  const pack = page.getByRole('region', { name: 'Fixture book' })
  await expect(pack).toBeVisible()
  await expect(pack.getByText('2 exams')).toBeVisible()
})

test('the app shows the address that a phone on the same Wi-Fi opens', async ({ page, startedFolder }) => {
  const { phone } = JSON.parse(await readFile(path.join(startedFolder.folder, 'app/private/address.json'), 'utf8'))
  expect(phone).toMatch(/^http:\/\//)

  await page.goto('./#/packs')

  const panel = page.getByRole('region', { name: 'On a phone or tablet' })
  await expect(panel).toBeVisible()
  await expect(panel.getByText(phone, { exact: true })).toBeVisible()
})

test("a recording of the pack plays from the start file's server", async ({ page }) => {
  await page.goto('./#/packs')
  await page
    .getByRole('region', { name: 'Fixture book' })
    .getByRole('listitem')
    .filter({ hasText: 'Exam 1' })
    .getByRole('link', { name: 'Hören' })
    .click()

  const audio = page.getByRole('region', { name: 'Recording' }).locator('audio')
  const duration = await audio.evaluate(
    (element: HTMLAudioElement) =>
      new Promise<number>((resolve, reject) => {
        if (element.readyState >= 1) resolve(element.duration)
        element.addEventListener('loadedmetadata', () => resolve(element.duration))
        element.addEventListener('error', () => reject(new Error(`audio error ${element.error?.code}`)))
        element.load()
      }),
  )
  expect(duration).toBeGreaterThan(0)
})

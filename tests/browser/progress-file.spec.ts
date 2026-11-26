import { readFile, writeFile } from 'node:fs/promises'
import type { Page, TestInfo } from '@playwright/test'
import { takeTest } from './taking-a-test.ts'
import { expect, test } from './test.ts'

const STORAGE_KEY = 'deutsch-tree:progress'

const topicInTree = (page: Page) => page.getByRole('main').getByRole('link', { name: /Fixture verbs/ })
const backupLink = (page: Page) => page.getByRole('contentinfo').getByRole('link', { name: 'Back up progress' })

/** Puts text into browser storage as if an earlier visit had saved it, then starts the app on it. */
async function startWithSaved(page: Page, text: string): Promise<void> {
  await page.goto('./')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, text] as const)
  await page.reload()
}

const savedText = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

/** Writes a file as a learner would have it on their device. */
async function fileOnDevice(testInfo: TestInfo, name: string, text: string): Promise<string> {
  const path = testInfo.outputPath(name)
  await writeFile(path, text)
  return path
}

/** Chooses a file in the import dialog of the backup page. */
async function chooseFile(page: Page, path: string): Promise<void> {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import a progress file' }).click()
  await (await chooser).setFiles(path)
}

/** A progress file as the app exports it, with these topics done. */
function progressFile(done: string[], { version = 1, exported = '2026-11-20T12:00:00.000Z' } = {}): string {
  const nodes = Object.fromEntries(done.map((id) => [id, { done: true, attempts: 1 }]))
  return JSON.stringify({ app: 'deutsch-tree', exported, version, nodes })
}

test('a learner exports progress, clears the browser and imports it back', async ({ page, context }, testInfo) => {
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicInTree(page)).toContainText('Done')

  // Export: the browser saves a file, and the page names it.
  await backupLink(page).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Back up your progress' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('1 topic done')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  const download = await downloading
  const fileName = download.suggestedFilename()
  expect(fileName).toMatch(/^deutsch-tree-progress-\d{4}-\d{2}-\d{2}\.json$/)
  await expect(page.getByRole('status')).toContainText(fileName)
  const path = testInfo.outputPath(fileName)
  await download.saveAs(path)

  // The file is the learner's only backup: it says what it is and holds the progress.
  const file = JSON.parse(await readFile(path, 'utf8'))
  expect(file).toMatchObject({
    app: 'deutsch-tree',
    version: 1,
    nodes: { 'grammar-001': { done: true, attempts: 1 } },
  })
  expect(Date.parse(file.exported)).not.toBeNaN()

  // The browser is cleared: everything is gone.
  await context.clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./')
  await page.reload()
  await expect(topicInTree(page)).toContainText('Start')
  await expect(topicInTree(page)).not.toContainText('Done')

  // Import: nothing is here to lose, so the file is taken at once.
  await backupLink(page).click()
  await expect(page.getByRole('main')).toContainText('0 topics done')
  await chooseFile(page, path)
  await expect(page.getByRole('status')).toContainText('Progress imported.')
  await expect(page.getByRole('main')).toContainText('1 topic done')

  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicInTree(page)).toContainText('Done')
  await page.reload()
  await expect(topicInTree(page)).toContainText('Done')
})

test('importing over existing progress warns first, and replaces it only after a yes', async ({ page }, testInfo) => {
  // Here: two topics done, but not "Fixture verbs". In the file: only "Fixture verbs".
  const here = '{"version":1,"nodes":{"old-001":{"done":true,"attempts":1},"old-002":{"done":true,"attempts":3}}}'
  await startWithSaved(page, here)
  const path = await fileOnDevice(testInfo, 'deutsch-tree-progress-2026-11-20.json', progressFile(['grammar-001']))

  await backupLink(page).click()
  await chooseFile(page, path)

  const warning = page.getByRole('alertdialog', { name: 'Replace the progress on this device?' })
  await expect(warning).toBeVisible()
  await expect(warning).toContainText('2 topics done')
  await expect(warning).toContainText('1 topic done')
  await expect(warning).toContainText('20 November 2026')
  expect(await savedText(page)).toBe(here)

  // No: everything stays as it was.
  await warning.getByRole('button', { name: 'Cancel' }).click()
  await expect(warning).toBeHidden()
  expect(await savedText(page)).toBe(here)

  // Yes: the file takes the place of what was here.
  await chooseFile(page, path)
  await warning.getByRole('button', { name: 'Replace progress' }).click()
  await expect(page.getByRole('status')).toContainText('Progress imported.')
  await expect(warning).toBeHidden()
  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicInTree(page)).toContainText('Done')
  expect(JSON.parse((await savedText(page)) ?? '').nodes).toEqual({ 'grammar-001': { done: true, attempts: 1 } })
})

test('a file from a newer version, or one that is no progress file, is refused with the reason and changes nothing', async ({
  page,
}, testInfo) => {
  const here = '{"version":1,"nodes":{"grammar-001":{"done":true,"attempts":1}}}'
  await startWithSaved(page, here)
  await backupLink(page).click()

  const newer = await fileOnDevice(testInfo, 'newer.json', progressFile(['grammar-002'], { version: 99 }))
  await chooseFile(page, newer)
  await expect(page.getByRole('alert')).toContainText('newer version of deutsch-tree')
  await expect(page.getByRole('alert')).toContainText('Nothing was changed')
  await expect(page.getByRole('alertdialog')).toBeHidden()

  const damaged = await fileOnDevice(testInfo, 'damaged.json', progressFile(['grammar-002']).slice(0, 60))
  await chooseFile(page, damaged)
  await expect(page.getByRole('alert')).toContainText('not a deutsch-tree progress file')
  await expect(page.getByRole('alertdialog')).toBeHidden()

  expect(await savedText(page)).toBe(here)
  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicInTree(page)).toContainText('Done')
})

test('progress for topics that today’s content does not have survives an import and the next export', async ({
  page,
}, testInfo) => {
  const path = await fileOnDevice(testInfo, 'from-another-device.json', progressFile(['grammar-001', 'retired-topic']))
  await page.goto('./#/backup')
  await chooseFile(page, path)
  await expect(page.getByRole('status')).toContainText('Progress imported.')

  // The topic that exists shows as done; the other one is kept, unseen.
  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicInTree(page)).toContainText('Done')
  await backupLink(page).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  const exported = testInfo.outputPath('exported-again.json')
  await (await downloading).saveAs(exported)
  expect(JSON.parse(await readFile(exported, 'utf8')).nodes).toMatchObject({
    'grammar-001': { done: true },
    'retired-topic': { done: true },
  })
})

/**
 * Starts the app with every published A1 topic done except "Fixture verbs",
 * whatever topics the fixture content has.
 */
async function startOneTopicShortOfA1(page: Page): Promise<void> {
  const index = await (await page.request.get('./content/index.json')).json()
  const others = (index.nodes as Array<{ id: string; level: string; status: string }>)
    .filter((node) => node.level === 'A1' && node.status === 'published' && node.id !== 'grammar-001')
    .map((node) => [node.id, { done: true, attempts: 1 }])
  await startWithSaved(page, JSON.stringify({ version: 1, nodes: Object.fromEntries(others) }))
}

test('after finishing a level the tree suggests a backup, once', async ({ page }) => {
  await startOneTopicShortOfA1(page)
  const suggestion = page.getByRole('region', { name: 'You have done every A1 topic there is so far.' })
  await expect(topicInTree(page)).toBeVisible()
  await expect(suggestion).toBeHidden()

  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(suggestion).toBeVisible()
  await expect(suggestion).toContainText('only in this browser')
  await page.reload()
  await expect(suggestion).toBeVisible()

  // "Not now" is an answer: the same milestone is not brought up again.
  await suggestion.getByRole('button', { name: 'Not now' }).click()
  await expect(suggestion).toBeHidden()
  await page.reload()
  await expect(topicInTree(page)).toContainText('Done')
  await expect(suggestion).toBeHidden()
})

test('the suggestion leads to the export, and is gone once the progress is exported', async ({ page }) => {
  await startOneTopicShortOfA1(page)
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await page.getByRole('link', { name: 'All topics' }).click()
  const suggestion = page.getByRole('region', { name: 'You have done every A1 topic there is so far.' })

  await suggestion.getByRole('link', { name: 'Back up progress' }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  await downloading
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(topicInTree(page)).toContainText('Done')
  await expect(suggestion).toBeHidden()
})

test('an app that finds progress from a newer version says so and leaves it untouched', async ({ page }) => {
  const fromTheFuture = '{"version":99,"nodes":{"grammar-001":{"done":true,"attempts":1}},"somethingNew":[1]}'
  await startWithSaved(page, fromTheFuture)

  const notice = page.getByRole('alert')
  await expect(notice).toContainText('saved by a newer version of deutsch-tree')
  await expect(notice.getByRole('button', { name: 'Reload' })).toBeVisible()

  // Whatever the learner does on this visit, the saved progress is not overwritten.
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  expect(await savedText(page)).toBe(fromTheFuture)
})

test('the backup page fits a phone in Persian, with the file name left to right', async ({ page }) => {
  await page.goto('./#/backup')
  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const downloading = page.waitForEvent('download')
  await page.getByRole('main').getByRole('button').first().click()
  const fileName = (await downloading).suggestedFilename()
  await expect(page.getByText(fileName)).toHaveCSS('direction', 'ltr')
  const sidewaysScroll = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sidewaysScroll).toBe(0)
})

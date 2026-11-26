import { readsLeftToRight, startsOnTheRight } from './direction.ts'
import { expect, test } from './test.ts'

test('one page shows every grammar table under its level and chapter, and a table leads to its topic', async ({
  page,
}) => {
  await page.goto('./')

  await page.getByRole('link', { name: 'All grammar' }).click()

  const overview = page.getByRole('main')
  await expect(overview.getByRole('heading', { level: 1 })).toHaveText('All grammar at a glance')
  await expect(overview.getByRole('heading', { level: 2 })).toHaveText(['A1 · Beginner', 'A2 · Elementary'])
  await expect(overview.getByRole('heading', { level: 3 })).toHaveText(['Fixture basics', 'Fixture nouns'])
  await expect(overview.getByRole('heading', { level: 4 })).toHaveText([
    'Fixture verbs',
    'Fixture umlauts',
    'Fixture articles',
    'Fixture plurals',
    'Fixture negation',
  ])
  const verbs = overview.getByRole('article').filter({ hasText: 'Fixture verbs' })
  await expect(verbs.getByRole('columnheader')).toHaveText(['Person', 'Form'])
  await expect(verbs.getByRole('cell')).toHaveText(['ich', 'wohne', 'du', 'wohnst'])

  await overview.getByRole('link', { name: 'Fixture verbs' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Take the test' })).toBeVisible()
})

test('a topic without a table leaves no empty box, and neither does its chapter', async ({ page }) => {
  await page.goto('./#/overview')
  const overview = page.getByRole('main')
  await expect(overview.getByRole('table')).toHaveCount(5)

  // Every box holds a table. The fixture's second chapter and its third level
  // hold only topics that are not written yet, so they are not here at all.
  await expect(overview.getByRole('article')).toHaveCount(5)
  await expect(overview).not.toContainText('Fixture topic not written yet')
  await expect(overview).not.toContainText('Fixture topics with sein')
  await expect(overview).not.toContainText('Fixture level not written yet')
  await expect(overview).not.toContainText('B1')
})

test('the tree does not load the tables; the overview page loads them, and no topic besides', async ({ page }) => {
  const loaded: string[] = []
  page.on('request', (request) => {
    const file = request.url().split('/content/')[1]
    if (file) loaded.push(file)
  })

  await page.goto('./')
  await expect(page.getByRole('main').getByRole('link', { name: /Fixture verbs/ })).toBeVisible()
  await page.waitForLoadState('networkidle')

  expect(loaded).toEqual(['index.json'])

  await page.getByRole('link', { name: 'All grammar' }).click()
  await expect(page.getByRole('main').getByRole('table')).toHaveCount(5)

  expect(loaded).toEqual(['index.json', 'overview.json'])
})

test('on the Persian page the names are Persian and right to left, and a table still reads left to right', async ({
  page,
}) => {
  await page.goto('./#/overview')
  await page.getByRole('button', { name: 'فارسی' }).click()
  const overview = page.getByRole('main')

  await expect(overview.getByRole('heading', { level: 1 })).toHaveText('همهٔ دستور زبان در یک نگاه')
  await expect(overview.getByRole('heading', { level: 2 })).toHaveText(['A1 · مبتدی', 'A2 · پایه'])
  await expect(overview.getByRole('heading', { level: 3 })).toHaveText(['مبانی آزمایشی', 'اسم‌های آزمایشی'])
  await expect(overview.getByRole('columnheader').first()).toHaveText('شخص')
  const topic = overview.getByRole('link', { name: 'فعل‌های آزمایشی' })
  expect(await readsLeftToRight(topic)).toBe(false)
  expect(await startsOnTheRight(topic)).toBe(true)

  // A row is German: "ich" stands to the left of "wohne", and each reads left to right.
  const person = await overview.getByRole('cell', { name: 'ich', exact: true }).boundingBox()
  const form = await overview.getByRole('cell', { name: 'wohne', exact: true }).boundingBox()
  expect(person?.x).toBeLessThan(form?.x ?? 0)
  expect(await readsLeftToRight(overview.getByRole('cell', { name: 'wohnst' }).locator('[lang="de"]'))).toBe(true)
})

test('the overview page fits the screen it is opened on, in English and in Persian', async ({ page }) => {
  const sidewaysScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await page.goto('./#/overview')
  await expect(page.getByRole('main').getByRole('table')).toHaveCount(5)
  expect(await sidewaysScroll()).toBe(0)

  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('main').getByRole('table')).toHaveCount(5)
  expect(await sidewaysScroll()).toBe(0)
})

test('while no grammar table is written, the overview page says so', async ({ page }) => {
  // The fixture content has a table, so the answer of the server is replaced here.
  await page.route('**/content/overview.json', (route) => route.fulfill({ json: { tables: [] } }))

  await page.goto('./#/overview')

  await expect(page.getByRole('main')).toContainText('No grammar table is written yet.')
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveCount(0)
})

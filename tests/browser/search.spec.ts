import type { Page } from '@playwright/test'
import { readsLeftToRight, startsOnTheRight } from './direction.ts'
import { expect, test } from './test.ts'

const results = (page: Page) => page.getByRole('main').getByRole('listitem')

/** How far the page can be scrolled sideways. A page that fits its screen gives 0. */
const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('a learner searches for a topic and opens it', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('link', { name: 'Search' }).click()
  await page.getByRole('searchbox', { name: 'Search all topics' }).fill('fixture verbs')

  await expect(results(page)).toHaveCount(1)
  await results(page)
    .getByRole('link', { name: /Fixture verbs/ })
    .click()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
  await expect(page.getByText('A fixture verb takes the ending of its person.')).toBeVisible()
})

test('search finds a topic by a word of its explanation or by a German word, and shows where it stands', async ({
  page,
}) => {
  await page.goto('./#/search')
  const box = page.getByRole('searchbox', { name: 'Search all topics' })

  await box.fill('ending')
  await expect(results(page)).toHaveCount(1)
  await expect(results(page)).toContainText('Fixture verbs')
  await expect(results(page)).toContainText('A fixture verb takes the ending of its person. With ich the ending is -e.')
  await expect(page.getByRole('status')).toHaveText('1 topic found')

  // A German word, in capitals: it is in an example sentence.
  await box.fill('BERLIN')
  await expect(results(page)).toContainText('Ich wohne in Berlin. – I live in Berlin.')

  // The German title of the topic.
  await box.fill('test-verben')
  await expect(results(page)).toContainText('Fixture verbs')
  await expect(results(page).locator('[lang="de"]')).toHaveText('Test-Verben')
})

test('a topic that is not written yet is found by its title and shown as coming soon', async ({ page }) => {
  await page.goto('./#/search')

  await page.getByRole('searchbox').fill('not written')

  await expect(results(page)).toHaveCount(1)
  await expect(results(page)).toContainText('Fixture topic not written yet')
  await expect(results(page)).toContainText('Coming soon')
  await expect(results(page).getByRole('link')).toHaveCount(0)
})

test('words that no topic has give a clear answer', async ({ page }) => {
  await page.goto('./#/search')

  await page.getByRole('searchbox').fill('xyzzy')

  await expect(page.getByRole('status')).toHaveText('No topic found. Try another word, or fewer words.')
  await expect(results(page)).toHaveCount(0)
})

test('coming back from a topic, the search is as the learner left it', async ({ page }) => {
  await page.goto('./#/search')
  await page.getByRole('searchbox').fill('fixture verbs')
  await results(page)
    .getByRole('link', { name: /Fixture verbs/ })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()

  await page.goBack()

  await expect(page.getByRole('searchbox')).toHaveValue('fixture verbs')
  await expect(results(page)).toContainText('Fixture verbs')
})

test('the tree loads no search data; search loads it, and only in the language of the learner', async ({ page }) => {
  const loaded: string[] = []
  page.on('request', (request) => {
    const file = request.url().split('/content/')[1]
    if (file) loaded.push(file)
  })

  await page.goto('./')
  await expect(page.getByRole('main').getByRole('link', { name: /Fixture verbs/ })).toBeVisible()
  await page.waitForLoadState('networkidle')

  expect(loaded).toEqual(['index.json'])

  await page.getByRole('link', { name: 'Search' }).click()
  await page.getByRole('searchbox').fill('fixture')
  await expect(results(page)).toHaveCount(2)

  expect(loaded).toEqual(['index.json', 'search/en.json'])
})

test('in Persian, search takes Persian as a learner types it, and shows the German of a result left to right', async ({
  page,
}) => {
  await page.goto('./#/search')
  await page.getByRole('button', { name: 'فارسی' }).click()
  const box = page.getByRole('searchbox', { name: 'جست‌وجو در همهٔ موضوع‌ها' })

  // The title is «فعل‌های آزمایشی». Typed here with a space for the zero-width
  // non-joiner, the Arabic form of ی, and no sign on the آ.
  await box.fill('فعل ها\u064A ازما\u064Aش\u064A')

  await expect(results(page)).toHaveCount(1)
  const title = results(page).getByText('فعل‌های آزمایشی')
  await expect(title).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('۱ موضوع پیدا شد')
  expect(await readsLeftToRight(title)).toBe(false)
  expect(await startsOnTheRight(title)).toBe(true)

  // A word of the Persian translation of an example: the German sentence
  // beside it still reads left to right.
  await box.fill('زندگی')

  await expect(results(page)).toContainText('من در برلین زندگی می‌کنم.')
  const german = results(page).locator('[lang="de"]').filter({ hasText: 'Ich wohne in Berlin.' })
  await expect(german).toHaveAttribute('dir', 'ltr')
  expect(await readsLeftToRight(german)).toBe(true)
})

test('search fits the screen it is opened on, in English and in Persian', async ({ page }) => {
  await page.goto('./#/search?q=fixture')
  await expect(results(page)).toHaveCount(2)
  await expect(page.getByRole('searchbox')).toBeInViewport()
  expect(await sidewaysScroll(page)).toBe(0)

  await page.getByRole('button', { name: 'فارسی' }).click()
  await page.getByRole('searchbox').fill('آزمایشی')
  await expect(results(page)).toHaveCount(2)
  expect(await sidewaysScroll(page)).toBe(0)
})

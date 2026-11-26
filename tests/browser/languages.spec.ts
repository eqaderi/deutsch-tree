import type { Locator } from '@playwright/test'
import { expect, test } from './test.ts'

/**
 * Whether the first letter of the text is drawn to the left of its last
 * letter. This measures what the learner sees, whatever markup or style
 * produced it.
 */
async function readsLeftToRight(text: Locator): Promise<boolean> {
  return text.evaluate((element) => {
    const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()
    const length = node?.textContent?.length ?? 0
    if (!node || length < 2) throw new Error('needs a text of two letters or more')
    const letter = (index: number) => {
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + 1)
      return range.getBoundingClientRect()
    }
    return letter(0).left < letter(length - 1).left
  })
}

/** Whether the element sits in the right half of the page's column. */
async function startsOnTheRight(element: Locator): Promise<boolean> {
  const column = await element.page().getByRole('main').boundingBox()
  const box = await element.boundingBox()
  if (!column || !box) throw new Error('element is not on the page')
  return box.x + box.width / 2 > column.x + column.width / 2
}

test('a learner switches to Persian: the page reads right to left, the German inside it left to right', async ({
  page,
}) => {
  await page.goto('./#/node/grammar-001')
  const title = page.getByRole('heading', { level: 1 })
  const german = page.locator('[lang="de"]')
  await expect(title).toHaveText('Fixture verbs')
  expect(await startsOnTheRight(page.getByRole('link', { name: 'All topics' }))).toBe(false)

  await page.getByRole('button', { name: 'فارسی' }).click()

  // The interface and the explanation are Persian.
  await expect(title).toHaveText('فعل‌های آزمایشی')
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'قاعده',
    'جدول',
    'مثال‌ها',
    'اشتباه‌های رایج',
    'آزمون',
  ])
  const rule = page.getByText('فعل آزمایشی پایانهٔ شخص خود را می‌گیرد.')
  await expect(rule).toBeVisible()
  await expect(page.getByText('من در برلین زندگی می‌کنم.')).toBeVisible()

  // The page is laid out right to left.
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  expect(await readsLeftToRight(title)).toBe(false)
  expect(await startsOnTheRight(page.getByRole('link', { name: 'همهٔ موضوع‌ها' }))).toBe(true)

  // German still reads left to right: a sentence, a table cell, and an ending
  // quoted inside a Persian sentence ("-e" must not turn into "e-").
  expect(await readsLeftToRight(german.filter({ hasText: 'Ich wohne in Berlin.' }))).toBe(true)
  expect(await readsLeftToRight(page.getByRole('cell', { name: 'wohnst' }).locator('[lang="de"]'))).toBe(true)
  expect(await readsLeftToRight(rule.locator('[lang="de"]').filter({ hasText: '-e' }))).toBe(true)

  // A table row is German too: "ich" stands to the left of "wohne".
  const person = await page.getByRole('cell', { name: 'ich', exact: true }).boundingBox()
  const form = await page.getByRole('cell', { name: 'wohne', exact: true }).boundingBox()
  expect(person?.x).toBeLessThan(form?.x ?? 0)

  // An example sentence starts at the same edge as its Persian translation.
  expect(await startsOnTheRight(german.filter({ hasText: 'Ich wohne in Berlin.' }))).toBe(true)
})

test('the language choice is remembered after a reload', async ({ page }) => {
  await page.goto('./#/node/grammar-001')
  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('فعل‌های آزمایشی')

  await page.reload()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('فعل‌های آزمایشی')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('button', { name: 'فارسی' })).toHaveAttribute('aria-pressed', 'true')

  // And on the next page the learner opens.
  await page.getByRole('link', { name: 'همهٔ موضوع‌ها' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('آلمانی از صفر تا B1')
})

test('in simple German the explanation is German and the examples need no translation', async ({ page }) => {
  await page.goto('./#/node/grammar-001')

  await page.getByRole('button', { name: 'Deutsch' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test-Verben')
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Regel',
    'Tabelle',
    'Beispiele',
    'Häufige Fehler',
    'Test',
  ])
  await expect(page.getByText('Ein Test-Verb bekommt die Endung der Person.')).toBeVisible()
  await expect(page.getByText('Ich wohne in Berlin.')).toBeVisible()
  await expect(page.getByText('I live in Berlin.')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
})

test('the German on a topic page is the same in all three languages', async ({ page }) => {
  await page.goto('./#/node/grammar-001')
  const german = page.getByRole('main').locator('[lang="de"]')
  const sameEverywhere = [
    'ich',
    '-e',
    'ich',
    'wohne',
    'du',
    'wohnst',
    'Ich wohne in Berlin.',
    'Wohnst du hier?',
    'Du wohne hier.',
    'Du wohnst hier.',
  ]

  for (const language of ['English', 'فارسی', 'Deutsch']) {
    await page.getByRole('button', { name: language }).click()
    await expect(page.getByRole('button', { name: language })).toHaveAttribute('aria-pressed', 'true')
    await expect(german).toHaveText(sameEverywhere)
  }
})

test('switching language keeps the learner in the same place', async ({ page }) => {
  // On the tree, with a level chosen.
  await page.goto('./#/?level=A1')
  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('آلمانی از صفر تا B1')
  expect(new URL(page.url()).hash).toBe('#/?level=A1')

  // On a topic's test. The page is the very same one, only in another
  // language: it is not opened again, so nothing the learner did on it is lost.
  await page.goto('./#/node/grammar-001/test')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('آزمون: فعل‌های آزمایشی')
  const pageBefore = await page.getByRole('main').elementHandle()

  await page.getByRole('button', { name: 'English' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test: Fixture verbs')
  expect(new URL(page.url()).hash).toBe('#/node/grammar-001/test')
  expect(await pageBefore?.evaluate((main) => main.isConnected)).toBe(true)
})

test('a Persian page fits the screen it is opened on', async ({ page }) => {
  for (const address of ['./', './#/node/grammar-001', './#/node/grammar-001/test']) {
    await page.goto(address)
    await page.getByRole('button', { name: 'فارسی' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const sidewaysScroll = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(sidewaysScroll, address).toBe(0)
  }
})

test.describe('on a first visit with a Persian browser', () => {
  test.use({ locale: 'fa-IR' })

  test('the site opens in Persian', async ({ page }) => {
    await page.goto('./')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('آلمانی از صفر تا B1')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})

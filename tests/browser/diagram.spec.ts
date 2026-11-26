import type { Locator } from '@playwright/test'
import { readsLeftToRight } from './direction.ts'
import { expect, test } from './test.ts'

/** The height in pixels at which the text is drawn, whatever scale the drawing has. */
function drawnSize(text: Locator): Promise<number> {
  return text.evaluate((element) => {
    const svg = element.closest('svg')
    if (!svg) throw new Error('the text is not in a drawing')
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
    return Number.parseFloat(getComputedStyle(element).fontSize) * scale
  })
}

test('a diagram stands after the rule and before the table, named by its caption', async ({ page }) => {
  await page.goto('./#/node/grammar-101')

  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Rule',
    'Diagram',
    'Table',
    'Examples',
    'Common mistakes',
    'Test',
  ])
  const diagram = page.getByRole('img', { name: 'The book lies auf dem Tisch.' })
  await expect(diagram).toBeVisible()
  // German drawn in it, and a label in the learner's language.
  await expect(diagram.locator('text[lang="de"]', { hasText: 'auf dem Tisch' })).toBeVisible()
  await expect(diagram.locator('text[lang="en"]')).toHaveText('the table')
})

test('a diagram’s text stays readable on the screen it is opened on, and the page does not scroll sideways', async ({
  page,
}) => {
  await page.goto('./#/node/grammar-101')
  const diagram = page.getByRole('img', { name: 'The book lies auf dem Tisch.' })

  expect(await drawnSize(diagram.locator('text', { hasText: 'the table' }))).toBeGreaterThanOrEqual(13)
  expect(await drawnSize(diagram.locator('text', { hasText: 'auf dem Tisch' }))).toBeGreaterThanOrEqual(15)
  // On a wide screen the drawing does not grow without end.
  expect(await drawnSize(diagram.locator('text', { hasText: 'auf dem Tisch' }))).toBeLessThanOrEqual(22)
  const sidewaysScroll = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sidewaysScroll).toBe(0)
})

test('in Persian a diagram keeps its left-to-right layout and writes its labels in Persian', async ({ page }) => {
  await page.goto('./#/node/grammar-101')
  await page.getByRole('button', { name: 'فارسی' }).click()

  const diagram = page.getByRole('img', { name: 'کتاب auf dem Tisch است.' })
  await expect(diagram).toBeVisible()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 }).nth(1)).toHaveText('نمودار')
  const label = diagram.locator('text[lang="fa"]')
  await expect(label).toHaveText('میز')
  expect(await readsLeftToRight(diagram.locator('text[lang="de"]', { hasText: 'auf dem Tisch' }))).toBe(true)

  // The drawing is not mirrored: the table is drawn from left to right, as in English.
  const table = await diagram.locator('rect').first().boundingBox()
  const book = await diagram.locator('rect').nth(1).boundingBox()
  expect(table && book && book.x > table.x).toBe(true)
})

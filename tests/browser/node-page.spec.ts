import { expect, test } from './test.ts'

test('a topic opens from the tree', async ({ page }) => {
  await page.goto('./')

  const tree = page.getByRole('main')
  await expect(tree.getByRole('link', { name: /Fixture verbs/ })).toBeVisible()

  await tree.getByRole('link', { name: /Fixture verbs/ }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
})

test('a topic page opens from a direct link, in the fixed section order, and survives a reload', async ({ page }) => {
  await page.goto('./#/node/grammar-001')

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Rule',
    'Table',
    'Examples',
    'Common mistakes',
    'Test',
  ])
  await expect(page.getByText('A fixture verb takes the ending of its person.')).toBeVisible()
  await expect(page.locator('[lang="de"]').filter({ hasText: 'Ich wohne in Berlin.' })).toBeVisible()
  await expect(page.getByText('I live in Berlin.')).toBeVisible()

  await page.reload()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
})

test('a topic page fits the screen it is opened on', async ({ page }) => {
  await page.goto('./#/node/grammar-001')

  await expect(page.getByRole('link', { name: 'Take the test' })).toBeInViewport()
  const sidewaysScroll = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sidewaysScroll).toBe(0)
})

test('the test button on a topic page leads to that topic’s test', async ({ page }) => {
  await page.goto('./#/node/grammar-001')

  await page.getByRole('link', { name: 'Take the test' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Test: Fixture verbs' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to the topic' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
})

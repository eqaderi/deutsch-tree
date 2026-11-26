import { expect, test } from './test.ts'

test('a level is a line of chapters, each with its name, its kind and its number of topics', async ({ page }) => {
  await page.goto('./')

  const chapters = page.getByRole('main').getByRole('group')
  await expect(chapters).toHaveCount(3)
  await expect(chapters.nth(0).getByRole('heading', { level: 3 })).toHaveText('Fixture basics')
  await expect(chapters.nth(0).locator('summary')).toContainText('Grammar')
  await expect(chapters.nth(0).locator('summary')).toContainText('1 topic')
  await expect(chapters.nth(1).getByRole('heading', { level: 3 })).toHaveText('Fixture topics with sein')
})

test('the first chapter is open; another chapter opens on a tap and closes again', async ({ page }) => {
  await page.goto('./')
  const tree = page.getByRole('main')
  const laterChapter = tree.getByRole('heading', { name: 'Fixture topics with sein' })
  const laterTopic = tree.getByRole('listitem').filter({ hasText: 'Fixture topic not written yet' })

  await expect(tree.getByRole('link', { name: /Fixture verbs/ })).toBeVisible()
  await expect(laterTopic).toBeHidden()

  await laterChapter.click()

  await expect(laterTopic).toBeVisible()
  await expect(laterTopic).toContainText('Coming soon')

  await laterChapter.click()

  await expect(laterTopic).toBeHidden()
})

test('a vocabulary chapter stands in the line of its level, and its nodes are marked "Coming soon"', async ({
  page,
}) => {
  await page.goto('./')
  const tree = page.getByRole('main')
  const chapter = tree.getByRole('group').filter({ hasText: 'Fixture words' })
  const node = chapter.getByRole('listitem').filter({ hasText: 'Fixture family words' })

  await expect(chapter.locator('summary')).toContainText('Vocabulary')
  await expect(chapter.locator('summary')).toContainText('1 topic')

  await chapter.getByRole('heading', { name: 'Fixture words' }).click()

  await expect(node).toContainText('Coming soon')
  await expect(node.getByRole('link')).toHaveCount(0)
})

test('coming back from a topic, the chapters are as the learner left them', async ({ page }) => {
  await page.goto('./')
  const tree = page.getByRole('main')
  await tree.getByRole('heading', { name: 'Fixture topics with sein' }).click()

  await tree.getByRole('link', { name: /Fixture verbs/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(tree.getByText('Fixture topic not written yet')).toBeVisible()
})

test('German in a chapter name reads left to right on the Persian page, without its asterisks', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'فارسی' }).click()

  const chapter = page.getByRole('main').getByRole('heading', { level: 3 }).nth(1)
  await expect(chapter).toHaveText('موضوع‌های آزمایشی با sein')
  const german = chapter.locator('[lang="de"]')
  await expect(german).toHaveText('sein')
  await expect(german).toHaveAttribute('dir', 'ltr')
})

test('the tree fits the screen it is opened on, with every chapter open', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('main').getByRole('heading', { name: 'Fixture topics with sein' }).click()

  const sidewaysScroll = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sidewaysScroll).toBe(0)
})

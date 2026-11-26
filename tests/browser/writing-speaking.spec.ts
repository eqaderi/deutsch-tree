import type { Page } from '@playwright/test'
import { expect, test } from './test.ts'

/**
 * Writing and speaking nodes: the task, a prompt to copy into an AI assistant,
 * and the score typed back in. The site itself talks to no AI service; the
 * rule in test.ts fails any journey that makes a request to another server.
 */

const WRITING = './#/node/exam-schreiben-1'
const SPEAKING = './#/node/exam-sprechen-1'

/** What the learner would paste into the assistant after pressing the copy button. */
async function copiedPrompt(page: Page, button = 'Copy the prompt'): Promise<string> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: button }).click()
  return page.evaluate(() => navigator.clipboard.readText())
}

async function enterScore(
  page: Page,
  score: string,
  words = { label: /Score from the assistant/, save: 'Save the score' },
) {
  await page.getByRole('textbox', { name: words.label }).fill(score)
  await page.getByRole('button', { name: words.save }).click()
}

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('a writing node opens from the tree and shows its task', async ({ page }) => {
  await page.goto('./#/?level=B1')

  await page
    .getByRole('main')
    .getByRole('link', { name: /Fixture writing/ })
    .click()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture writing: an e-mail to a friend' })).toBeVisible()
  const task = page.getByRole('region', { name: 'Task' })
  await expect(task.locator('[lang="de"]').first()).toBeVisible()
  await expect(task).toContainText('Schreiben, Aufgabe 1')
  await expect(task).toContainText('Sie waren am Samstag auf dem Fixture-Fest in Ihrer Straße.')
  await expect(task.getByRole('listitem')).toHaveText([
    'Beschreiben Sie: Wie war das Fest?',
    'Begründen Sie: Was hat Ihnen besonders gut gefallen und warum?',
    'Schlagen Sie ein Treffen vor.',
  ])
  await expect(task).toContainText('ungefähr 80 Wörtern')
})

test('the copy button of a writing node copies a prompt with the task, the official criteria and strict grading', async ({
  page,
}) => {
  await page.goto(WRITING)

  const prompt = await copiedPrompt(page)

  await expect(page.getByRole('status')).toContainText('Copied')
  // The task.
  expect(prompt).toContain('Sie waren am Samstag auf dem Fixture-Fest in Ihrer Straße.')
  expect(prompt).toContain('Schlagen Sie ein Treffen vor.')
  // The official criteria, with their points.
  for (const criterion of ['Erfüllung', 'Kohärenz', 'Wortschatz', 'Strukturen']) expect(prompt).toContain(criterion)
  expect(prompt).toContain('A = 10 | B = 7.5 | C = 5 | D = 2.5 | E = 0')
  expect(prompt).toContain('Alle 3 Sprachfunktionen inhaltlich und umfänglich angemessen behandelt')
  // Strict grading, and one score to type back in.
  expect(prompt).toContain('Grade strictly')
  expect(prompt).toContain('SCORE: <number>/100')
  expect(prompt).toContain('Write your answer in English')
})

test('the copy button of a speaking node copies a prompt that runs the part in voice mode and scores it', async ({
  page,
}) => {
  await page.goto(SPEAKING)
  await expect(page.getByRole('region', { name: 'Task' })).toContainText('Sprechen, Teil 1: Gemeinsam etwas planen')
  await expect(page.getByRole('region', { name: 'Task' })).toContainText('Wer bringt was mit?')

  const prompt = await copiedPrompt(page)

  expect(prompt).toContain('Ihr Kurs macht am Ende ein Fixture-Fest.')
  expect(prompt).toContain('voice mode')
  expect(prompt).toContain('you are the other candidate')
  expect(prompt).toContain('Speak only German')
  for (const criterion of ['Erfüllung', 'Interaktion', 'Wortschatz', 'Strukturen', 'Aussprache']) {
    expect(prompt).toContain(criterion)
  }
  expect(prompt).toContain('Grade strictly')
  expect(prompt).toContain('out of 100')
  // The learner is told what the score rests on.
  await expect(page.getByRole('main')).toContainText('16 of the 100 points are for pronunciation')
})

test('a score of 90 marks the node done, and the score and the state are still there after a reload', async ({
  page,
}) => {
  await page.goto(WRITING)
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeHidden()

  await enterScore(page, '90')

  const score = page.getByRole('region', { name: 'Your score', exact: true })
  await expect(score).toContainText('90 of 100')
  await expect(score).toContainText('This topic is now done.')
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('region', { name: 'Your score', exact: true })).toContainText('90 of 100')
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'All topics' }).click()
  await page.getByRole('link', { name: /B1/ }).click()
  await expect(page.getByRole('main').getByRole('link', { name: /Fixture writing/ })).toContainText('Done')
})

test('a score of 89 does not mark the node done; a later 95 does, and every score is kept', async ({ page }) => {
  await page.goto(SPEAKING)

  await enterScore(page, '89')

  const score = page.getByRole('region', { name: 'Your score', exact: true })
  await expect(score).toContainText('89 of 100')
  await expect(score).toContainText('You need 90 of 100 to finish this topic.')
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeHidden()

  await enterScore(page, '95')

  await expect(score).toContainText('95 of 100')
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()
  await expect(score.getByRole('list', { name: 'Your scores so far' }).getByRole('listitem')).toHaveText(['89', '95'])

  await page.reload()

  await expect(
    page
      .getByRole('region', { name: 'Your score', exact: true })
      .getByRole('list', { name: 'Your scores so far' })
      .getByRole('listitem'),
  ).toHaveText(['89', '95'])
})

test('a lower score after the node is done leaves it done', async ({ page }) => {
  await page.goto(WRITING)
  await enterScore(page, '93')

  await enterScore(page, '70')

  const score = page.getByRole('region', { name: 'Your score', exact: true })
  await expect(score).toContainText('70 of 100')
  await expect(score).toContainText('This topic was already done. It stays done.')
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()
})

test('something that is not a score from 0 to 100 is refused and nothing is saved', async ({ page }) => {
  await page.goto(WRITING)

  for (const typed of ['very good', '120', '87.5', '']) {
    await enterScore(page, typed)
    await expect(page.getByRole('alert')).toHaveText('Type a whole number from 0 to 100.')
  }
  await page.reload()

  await expect(page.getByRole('region', { name: 'Your score', exact: true })).toContainText('No score yet.')
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeHidden()
})

test('in Persian the page reads right to left, the task stays German, and the assistant is asked to answer in Persian', async ({
  page,
}) => {
  await page.goto(WRITING)
  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('نوشتن آزمایشی: ایمیل به یک دوست')
  const situation = page.locator('[lang="de"]').filter({ hasText: 'Sie waren am Samstag' }).first()
  await expect(situation).toHaveAttribute('dir', 'ltr')

  const prompt = await copiedPrompt(page, 'کپی کردن پرامپت')
  expect(prompt).toContain('Write your answer in Persian')
  expect(prompt).toContain('Sie waren am Samstag auf dem Fixture-Fest in Ihrer Straße.')

  // A Persian keyboard types Persian digits.
  await enterScore(page, '۹۲', { label: /نمره/, save: 'ذخیرهٔ نمره' })
  await expect(page.getByRole('main')).toContainText('۹۲ از ۱۰۰')
  await expect(page.getByRole('main').getByText('تمام‌شده', { exact: true })).toBeVisible()
  expect(await sidewaysScroll(page)).toBe(0)
})

test('when the browser refuses to copy, the prompt is shown so that the learner can copy it by hand', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  })
  await page.goto(SPEAKING)

  await page.getByRole('button', { name: 'Copy the prompt' }).click()

  await expect(page.getByRole('status')).toContainText('Select the whole prompt below and copy it yourself')
  await expect(page.getByRole('textbox', { name: 'The prompt' })).toHaveValue(/Speak only German/)
})

test('the prompt can be read before it is copied', async ({ page }) => {
  await page.goto(WRITING)

  await page.getByText('Read the prompt').click()

  await expect(page.getByRole('textbox', { name: 'The prompt' })).toHaveValue(/Grade strictly/)
  expect(await sidewaysScroll(page)).toBe(0)
})

test('a writing node has no test of questions: the address of its test leads to its page', async ({ page }) => {
  await page.goto(`${WRITING}/test`)

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture writing: an e-mail to a friend' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy the prompt' })).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#/node/exam-schreiben-1')
})

test('a writing or speaking page fits the screen it is opened on', async ({ page }) => {
  for (const address of [WRITING, SPEAKING]) {
    await page.goto(address)
    await expect(page.getByRole('button', { name: 'Copy the prompt' })).toBeVisible()
    expect(await sidewaysScroll(page)).toBe(0)
  }
})

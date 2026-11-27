import type { Page } from '@playwright/test'
import { serveCurriculum } from './curriculum.ts'
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

/** What the copy button answered. The page has other status lines: the score's, and the one of un-marking. */
const promptStatus = (page: Page) => page.getByRole('region', { name: 'How to get your score' }).getByRole('status')

/** The row of a topic in the tree, and its link to the topic's page. */
const row = (page: Page, title: string) =>
  page.getByRole('main').getByRole('group').getByRole('listitem').filter({ hasText: title })
const topicLink = (page: Page, title: string) => row(page, title).getByRole('link', { name: new RegExp(title) })
const nextTopic = (page: Page) => page.getByRole('region', { name: 'Your next topic' })

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('a writing node opens from the tree and shows its task', async ({ page }) => {
  await page.goto('./#/?level=B1')
  const tree = page.getByRole('main')

  // Its chapter is not the first of the level, so it starts closed.
  await tree.getByRole('heading', { name: 'Fixture exam: writing' }).click()
  await tree.getByRole('link', { name: /Fixture writing/ }).click()

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

  await expect(promptStatus(page)).toContainText('Copied')
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
  await page.getByRole('main').getByRole('heading', { name: 'Fixture exam: writing' }).click()
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

test('entered scores go into the exported progress file and come back when it is imported', async ({
  page,
}, testInfo) => {
  await page.goto(WRITING)
  await enterScore(page, '72')
  await enterScore(page, '93')

  await page.getByRole('contentinfo').getByRole('link', { name: 'Back up progress' }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  const download = await downloading
  const path = testInfo.outputPath(download.suggestedFilename())
  await download.saveAs(path)

  // The browser is cleared: the scores are gone.
  await page.evaluate(() => localStorage.clear())
  await page.goto(WRITING)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Your score', exact: true })).toContainText('No score yet.')

  await page.getByRole('contentinfo').getByRole('link', { name: 'Back up progress' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import a progress file' }).click()
  await (await chooser).setFiles(path)
  await expect(page.getByRole('status')).toContainText('Progress imported.')

  await page.goto(WRITING)
  const score = page.getByRole('region', { name: 'Your score', exact: true })
  await expect(score.getByRole('list', { name: 'Your scores so far' }).getByRole('listitem')).toHaveText(['72', '93'])
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()
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

  const prompt = await copiedPrompt(page, 'کپی پرامپت')
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

  await expect(promptStatus(page)).toContainText('Select the whole prompt below and copy it yourself')
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

test('the tree shows a writing node as in progress after a low score and done after 90, and never offers a test of it', async ({
  page,
}) => {
  // The tree keeps a chapter open or closed as the learner left it until a reload; reloading starts it closed.
  const openWriting = async () => {
    await page.goto('./#/?level=B1')
    await page.reload()
    await page.getByRole('main').getByRole('heading', { name: 'Fixture exam: writing' }).click()
  }
  await openWriting()
  await expect(topicLink(page, 'Fixture writing')).toContainText('Start')
  await expect(row(page, 'Fixture writing').getByRole('link')).toHaveCount(1)

  await topicLink(page, 'Fixture writing').click()
  await enterScore(page, '89')
  await openWriting()

  await expect(topicLink(page, 'Fixture writing')).toContainText('Continue')
  await expect(topicLink(page, 'Fixture writing')).not.toContainText('Done')

  await topicLink(page, 'Fixture writing').click()
  await enterScore(page, '90')
  await openWriting()

  await expect(topicLink(page, 'Fixture writing')).toContainText('Done')
  await expect(row(page, 'Fixture writing').getByRole('link')).toHaveCount(1)
  await expect(row(page, 'Fixture writing').getByRole('link', { name: 'Test', exact: true })).toHaveCount(0)
})

test('a writing node can be the next topic: it is opened from there, with no test to start, until a score of 90', async ({
  page,
}) => {
  // The writing node is the only topic that is written, so it is next.
  await serveCurriculum(page, [
    { level: 'A1', kind: 'grammar', name: 'Verbs', topics: ['g0 soon'] },
    { level: 'B1', kind: 'exam-part', name: 'Writing', topics: ['exam-schreiben-1 no-test'] },
  ])
  await page.goto('./')

  await expect(nextTopic(page)).toContainText('Topic exam-schreiben-1')
  await expect(nextTopic(page).getByRole('link', { name: 'Take the test' })).toHaveCount(0)
  await nextTopic(page).getByRole('link', { name: 'Start' }).click()
  await expect(page.getByRole('button', { name: 'Copy the prompt' })).toBeVisible()

  await enterScore(page, '60')
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(nextTopic(page)).toContainText('Topic exam-schreiben-1')
  await nextTopic(page).getByRole('link', { name: 'Continue' }).click()
  await enterScore(page, '94')
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(nextTopic(page)).not.toContainText('Topic exam-schreiben-1')
  await expect(nextTopic(page)).toContainText('You have done every topic that is written so far.')
})

test('a learner un-marks a done writing node: it is in progress, its scores are kept, and a new score of 90 finishes it again', async ({
  page,
}) => {
  await page.goto(WRITING)
  await enterScore(page, '93')
  const done = page.getByRole('main').getByText('Done', { exact: true })
  const score = page.getByRole('region', { name: 'Your score', exact: true })
  await expect(score).toContainText('This topic is now done.')

  await page.getByRole('button', { name: 'Mark as not done' }).click()
  await page.getByRole('button', { name: 'Yes, mark as not done' }).click()

  await expect(done).toBeHidden()
  await expect(page.getByRole('main')).toContainText('This topic is not done any more.')
  // The score is still there, and the page does not say "done" beside it any more.
  await expect(score).toContainText('93 of 100')
  await expect(score).not.toContainText('This topic is now done.')
  await expect(score).toContainText('You need 90 of 100 to finish this topic.')

  await page.goto('./#/?level=B1')
  await page.reload()
  await page.getByRole('main').getByRole('heading', { name: 'Fixture exam: writing' }).click()
  await expect(topicLink(page, 'Fixture writing')).toContainText('Continue')

  await topicLink(page, 'Fixture writing').click()
  await enterScore(page, '91')

  await expect(done).toBeVisible()
  await expect(score).toContainText('This topic is now done.')
  await expect(score.getByRole('list', { name: 'Your scores so far' }).getByRole('listitem')).toHaveText(['93', '91'])
})

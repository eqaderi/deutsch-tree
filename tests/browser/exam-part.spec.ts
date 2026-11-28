import type { Page } from '@playwright/test'
import { answerTask, answerWord, ITEMS, itemsOnScreen, taskOnScreen } from './taking-a-task.ts'
import { asShown, reportedIssue, reportLink } from './taking-a-test.ts'
import { expect, test } from './test.ts'

const PART = './#/node/exam-lesen-1'
const PRACTICE = './#/node/exam-lesen-1/test'

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

/**
 * The exam part in the tree, which must be open: under level B1, in the
 * chapter of the exam's reading parts. That chapter is not the first of its
 * level, so it is closed until the learner opens it.
 */
async function partInTree(page: Page) {
  await page.getByRole('navigation', { name: 'Levels' }).getByRole('link', { name: /B1/ }).click()
  const chapter = page.getByRole('main').getByRole('group').filter({ hasText: 'Fixture exam: reading' })
  await expect(chapter).toBeVisible()
  if ((await chapter.getAttribute('open')) === null) await chapter.getByRole('heading').click()
  return chapter.getByRole('link', { name: /Fixture reading, part 1/ })
}

test('an exam part page says what the part asks, how it is scored and how to approach it', async ({ page }) => {
  await page.goto('./')
  await (await partInTree(page)).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture reading, part 1' })).toBeVisible()
  // Which part of the exam it is, in words.
  const main = page.getByRole('main')
  await expect(main.getByText('Exam parts', { exact: true })).toBeVisible()
  await expect(main.getByText('Reading', { exact: true })).toBeVisible()
  await expect(main.getByText('Part 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'What this part asks',
    'How it is scored',
    'How to approach it',
    'Practice task',
  ])
  await expect(page.getByText('You read one fixture text and decide whether six statements')).toBeVisible()
  await expect(page.getByText('Each right answer is one fixture point.')).toBeVisible()
  await expect(page.getByRole('list', { name: 'How to approach it' }).getByRole('listitem')).toHaveText([
    'Read the six statements first.',
    'Then look for each statement in the text.',
  ])
  await expect(page.getByRole('link', { name: 'Start the practice task' })).toBeInViewport()
  expect(await sidewaysScroll(page)).toBe(0)
})

test('a writing or speaking page begins like every exam part, then has its task, prompt and score', async ({
  page,
}) => {
  for (const [address, task] of [
    ['./#/node/exam-schreiben-1', 'You write a fixture e-mail to a friend about three points.'],
    ['./#/node/exam-sprechen-1', 'You plan a fixture party with a partner.'],
  ] as const) {
    await page.goto(address)

    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
      'What this part asks',
      'How it is scored',
      'How to approach it',
      'Task',
      'How to get your score',
      'Your score',
    ])
    await expect(page.getByText(task)).toBeVisible()
  }
})

test('the page of an exam part is there in Persian and in simple German too', async ({ page }) => {
  await page.goto(PART)

  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('خواندن آزمایشی، بخش ۱')
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'آنچه این بخش می‌خواهد',
    'نمره‌دهی',
    'روش حل این بخش',
    'تمرین',
  ])
  await expect(page.getByRole('main').getByText('خواندن', { exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByText('بخش ۱', { exact: true })).toBeVisible()
  await expect(page.getByText('یک متن آزمایشی می‌خوانید')).toBeVisible()
  // The exam's own words stay German and read left to right.
  const german = page.getByRole('main').locator('[lang="de"]').filter({ hasText: 'Richtig' })
  await expect(german).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('list', { name: 'روش حل این بخش' }).getByRole('listitem')).toHaveText([
    'اول شش جمله را بخوانید.',
    'بعد هر جمله را در متن پیدا کنید.',
  ])
  expect(await sidewaysScroll(page)).toBe(0)

  await page.getByRole('button', { name: 'Deutsch' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test-Lesen, Teil 1')
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Was du in diesem Teil machst',
    'So gibt es Punkte',
    'So löst du diesen Teil',
    'Übung',
  ])
  await expect(page.getByText('Jede richtige Antwort ist ein Test-Punkt.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Übung starten' })).toBeVisible()
})

test('a learner takes the practice task of an exam part, gets every item right, and the part is done after a reload', async ({
  page,
}) => {
  await page.goto('./')
  const inTree = await partInTree(page)
  await expect(inTree).toContainText('Start')
  await inTree.click()
  await page.getByRole('link', { name: 'Start the practice task' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Practice: Fixture reading, part 1' })).toBeVisible()
  const check = page.getByRole('button', { name: 'Check answers' })
  await expect(check).toBeDisabled()
  await expect(page.getByText(`0 of ${ITEMS} answered`)).toBeVisible()

  // The task is one whole text of the part, in German, with the six statements about it.
  const task = await taskOnScreen(page)
  const text = page.getByRole('article')
  await expect(text).toHaveAttribute('lang', 'de')
  await expect(text.getByRole('heading')).toHaveText(task.texts[0]?.title ?? '')
  await expect(text).toContainText(task.id === 't1' ? 'ich wohne seit Mai in Bonn.' : 'Er dauert drei Monate')
  await expect(itemsOnScreen(page)).toContainText(task.items.map((item) => item.prompt))

  await answerTask(page, () => 'right')
  await expect(page.getByText(`${ITEMS} of ${ITEMS} answered`)).toBeVisible()
  await check.click()

  await expect(page.getByRole('heading', { name: 'Passed' })).toBeFocused()
  await expect(page.getByRole('main')).toContainText('6 of 6 right')
  await expect(page.getByText('This topic is now done.')).toBeVisible()
  await expect(itemsOnScreen(page, 'Your answers')).toHaveCount(ITEMS)
  for (const item of await itemsOnScreen(page, 'Your answers').all()) {
    await expect(item).toContainText('Your answer is right')
  }

  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(await partInTree(page)).toContainText('Done')

  await page.reload()

  await expect(await partInTree(page)).toContainText('Done')
})

test('the practice task of an exam part starts from the tree, without opening the part’s page', async ({ page }) => {
  await page.goto('./')
  await expect(await partInTree(page)).toBeVisible()
  // Beside the link to the part's page, its row has a link straight to the practice task.
  const row = page.getByRole('main').getByRole('listitem').filter({ hasText: 'Fixture reading, part 1' })

  await row.getByRole('link', { name: 'Practice task' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Practice: Fixture reading, part 1' })).toBeVisible()
  await expect(itemsOnScreen(page)).toHaveCount(ITEMS)
})

test('one wrong item of six does not pass; every item shows its result, and the wrong one its right answer and reason', async ({
  page,
}) => {
  await page.goto(PRACTICE)

  const task = await answerTask(page, (place) => (place === 3 ? 'wrong' : 'right'))
  await page.getByRole('button', { name: 'Check answers' }).click()

  await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('5 of 6 right')
  await expect(page.getByText('You need 6 of 6 right to pass.')).toBeVisible()

  const results = itemsOnScreen(page, 'Your answers')
  await expect(results).toHaveCount(ITEMS)
  for (const [index, item] of task.items.entries()) {
    const result = results.nth(index)
    await expect(result).toContainText(`Question ${index + 1}`)
    await expect(result).toContainText(item.prompt)
    await expect(result).toContainText(index === 2 ? 'Your answer is wrong' : 'Your answer is right')
    // The reason is there for every item: a right answer may have been a guess.
    await expect(result).toContainText(asShown(item.explanation.en))
  }
  const wrong = task.items[2]
  if (!wrong) throw new Error('the task has no third item')
  await expect(results.nth(2).getByRole('term')).toHaveText(['Your answer', 'Right answer'])
  await expect(results.nth(2).getByRole('definition')).toHaveText([answerWord(!wrong.answer), answerWord(wrong.answer)])
  // A right answer is shown once: it is the right answer.
  await expect(results.nth(0).getByRole('term')).toHaveText(['Your answer'])
  await expect(results.nth(0).getByRole('definition')).toHaveText([answerWord(task.items[0]?.answer === true)])

  // The text stays on the page, so that the reasons can be checked against it.
  await expect(page.getByRole('article')).toContainText(task.texts[0]?.title ?? '')

  // Failing costs nothing: the part is as it was.
  await page.getByRole('link', { name: 'Back to the topic' }).last().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture reading, part 1' })).toBeVisible()
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toHaveCount(0)
})

test('trying again brings another practice task, and failing a done part leaves it done', async ({ page }) => {
  await page.goto(PRACTICE)
  const first = await answerTask(page, () => 'right')
  await page.getByRole('button', { name: 'Check answers' }).click()
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()

  await page.getByRole('button', { name: 'Try again' }).click()

  // The fixture part has two tasks, so the new attempt is the other one, unanswered.
  await expect(page.getByText(`0 of ${ITEMS} answered`)).toBeVisible()
  const second = await answerTask(page, () => 'wrong')
  expect(second.id).not.toBe(first.id)
  await page.getByRole('button', { name: 'Check answers' }).click()

  await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('0 of 6 right')
  await expect(page.getByText('This topic was already done. It stays done.')).toBeVisible()

  await page.goto(PART)
  await expect(page.getByRole('main').getByText('Done', { exact: true })).toBeVisible()
})

test('every item of a practice task has a "report a problem" link that names the part, the task and the item', async ({
  page,
}) => {
  await page.goto(PRACTICE)
  const task = await taskOnScreen(page)

  for (const [index, item] of task.items.entries()) {
    const link = reportLink(itemsOnScreen(page).nth(index))
    await expect(link).toHaveAttribute('target', '_blank')
    const issue = await reportedIssue(link)
    expect(issue.site).toBe('https://github.com')
    expect(issue).toMatchObject({ node: 'exam-lesen-1', question: `${task.id}/${item.id}` })
    expect(issue.body).toContain(item.prompt)
  }

  // And in the result, where a learner sees the right answer and may doubt it.
  await answerTask(page, () => 'wrong')
  await page.getByRole('button', { name: 'Check answers' }).click()
  const results = itemsOnScreen(page, 'Your answers')
  await expect(results).toHaveCount(ITEMS)
  for (const [index, item] of task.items.entries()) {
    expect(await reportedIssue(reportLink(results.nth(index)))).toMatchObject({
      node: 'exam-lesen-1',
      question: `${task.id}/${item.id}`,
    })
  }
})

test('in Persian the practice task keeps its German text left to right, and the answers already given', async ({
  page,
}) => {
  await page.goto(PRACTICE)
  const task = await answerTask(page, (place) => (place === 1 ? 'wrong' : 'right'))

  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('تمرین: خواندن آزمایشی، بخش ۱')
  await expect(page.getByRole('article')).toHaveAttribute('dir', 'ltr')
  expect((await taskOnScreen(page, 'پرسش‌ها')).id).toBe(task.id)
  await expect(page.getByText('۶ از ۶ پاسخ داده شده')).toBeVisible()
  expect(await sidewaysScroll(page)).toBe(0)

  await page.getByRole('button', { name: 'بررسی پاسخ‌ها' }).click()

  await expect(page.getByRole('heading', { name: 'هنوز قبول نشده‌اید' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('۵ از ۶ درست')
  const results = itemsOnScreen(page, 'پاسخ‌های شما')
  await expect(results.nth(0)).toContainText('پاسخ شما نادرست است')
  await expect(results.nth(0)).toContainText(asShown(task.items[0]?.explanation.fa ?? ''))
  await expect(results.nth(1)).toContainText('پاسخ شما درست است')
  expect(await sidewaysScroll(page)).toBe(0)

  // The result survives a change of language too, with its reasons in that language.
  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page.getByRole('heading', { name: 'Noch nicht bestanden' })).toBeVisible()
  await expect(itemsOnScreen(page, 'Deine Antworten').nth(0)).toContainText(
    asShown(task.items[0]?.explanation.de ?? ''),
  )
})

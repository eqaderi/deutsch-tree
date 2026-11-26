import type { Locator, Page } from '@playwright/test'
import {
  answerField,
  asShown,
  type FixtureQuestion,
  fixturePool,
  giveAnswer,
  questionOnScreen,
  rightAnswerText,
  TYPED_ATTEMPT_SIZE,
  TYPED_NODE,
  takeTypedTest,
} from './taking-a-test.ts'
import { expect, test } from './test.ts'

const TYPED_TEST = `./#/node/${TYPED_NODE}/test`

/** What the result says about each slip that is accepted. */
const SUBSTITUTE_NOTE = 'Accepted. The exact spelling has ä, ö, ü or ß.'
const CAPITALS_NOTE = 'Accepted. Mind the capital and small letters.'

/**
 * Answers right until the question `id` is on screen. An attempt of the typed
 * node leaves one question out, so this starts another attempt when one ends
 * without it.
 */
async function goToQuestion(page: Page, id: string): Promise<FixtureQuestion> {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    for (let place = 1; place <= TYPED_ATTEMPT_SIZE; place += 1) {
      await expect(page.getByText(`Question ${place} of ${TYPED_ATTEMPT_SIZE}`)).toBeVisible()
      const question = await questionOnScreen(page)
      if (question.id === id) return question
      await giveAnswer(page, question, 'right')
      await page.getByRole('button', { name: place < TYPED_ATTEMPT_SIZE ? 'Next' : 'Check answers' }).click()
    }
    await page.getByRole('button', { name: 'Try again' }).click()
  }
  throw new Error(`no attempt in 20 held the question ${id}`)
}

/** Puts the cursor into the field before the letter at `start`, or selects from `start` up to `end`. */
async function putCursor(field: Locator, start: number, end = start) {
  await field.focus()
  await field.evaluate(
    (input: HTMLInputElement, [from, to]) => input.setSelectionRange(from ?? 0, to ?? 0),
    [start, end],
  )
}

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('a learner passes a test by typing the answers', async ({ page }) => {
  await page.goto(TYPED_TEST)
  await expect(page.getByRole('heading', { level: 1, name: 'Test: Fixture umlauts' })).toBeVisible()

  const places = await takeTypedTest(page, (question) => rightAnswerText(question))

  // The attempt held 15 different questions of the pool: typed answers and typed gap fills.
  const pool = await fixturePool(TYPED_NODE)
  expect(places.size).toBe(15)
  expect([...places.keys()].every((id) => pool.has(id))).toBe(true)
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('15 of 15 right')
  // Answers written exactly get no note.
  await expect(page.getByRole('heading', { name: 'Accepted with a note' })).toHaveCount(0)
})

test('the letter buttons write ä, ö, ü and ß where the cursor is, and typing goes on from there', async ({
  page,
  hasTouch,
}) => {
  await page.goto(TYPED_TEST)
  const field = answerField(page)
  const letters = page.getByRole('group', { name: 'German letters' })
  const press = (letter: string) => {
    const button = letters.getByRole('button', { name: letter, exact: true })
    return hasTouch ? button.tap() : button.click()
  }
  await expect(letters.getByRole('button')).toHaveText(['ä', 'ö', 'ü', 'ß'])

  // Into an empty field that the learner has not touched yet.
  await press('ü')
  await expect(field).toHaveValue('ü')
  await expect(field).toBeFocused()
  await page.keyboard.type('ben')
  await expect(field).toHaveValue('üben')

  // In the middle of a word: each letter lands at the cursor, and the cursor stays behind it.
  for (const [before, at, letter, after] of [
    ['Mdchen', 1, 'ä', 'Mädchen'],
    ['schn', 3, 'ö', 'schön'],
    ['mde', 1, 'ü', 'müde'],
    ['Fuball', 2, 'ß', 'Fußball'],
  ] as const) {
    await field.fill(before)
    await putCursor(field, at)
    await press(letter)
    await expect(field).toHaveValue(after)
    await expect(field).toBeFocused()
    await page.keyboard.type('X')
    await expect(field).toHaveValue(`${after.slice(0, at + 1)}X${after.slice(at + 1)}`)
  }

  // A selection is replaced, as a key of the keyboard would replace it.
  await field.fill('Fussball')
  await putCursor(field, 2, 4)
  await press('ß')
  await expect(field).toHaveValue('Fußball')

  // Each button is large enough for a finger.
  for (const button of await letters.getByRole('button').all()) {
    const box = await button.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
})

test('a typed gap fill shows what is typed inside its sentence', async ({ page }) => {
  await page.goto(TYPED_TEST)
  await goToQuestion(page, 'q1')
  await expect(page.getByRole('main')).not.toContainText('Wir spielen Fußball.')

  await answerField(page).fill('Fußball')

  await expect(page.getByRole('main')).toContainText('Wir spielen Fußball.')
})

test('a question cannot be left without an answer, and Enter in the field goes on to the next question', async ({
  page,
}) => {
  await page.goto(TYPED_TEST)
  await expect(page.getByText('Question 1 of 15')).toBeVisible()
  const first = await questionOnScreen(page)
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()

  // Spaces alone are no answer.
  await answerField(page).pressSequentially('  ')
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  await answerField(page).press('Enter')
  await expect(page.getByText('Question 1 of 15')).toBeVisible()

  await answerField(page).fill(rightAnswerText(first))
  await answerField(page).press('Enter')

  await expect(page.getByText('Question 2 of 15')).toBeVisible()
  await expect(answerField(page)).toHaveValue('')
})

test('extra spaces are ignored; ae, oe, ue, ss and wrong capitals are accepted and shown with a note', async ({
  page,
}) => {
  await page.goto(TYPED_TEST)
  const typed: Record<string, string> = {
    // Accepted with a note.
    q1: 'fussball',
    q2: 'schoen',
    q4: 'mädchen',
    q8: 'ueben',
    // Right without a note: only the spaces differ, or it is the second accepted answer.
    q3: '  müde ',
    q9: ' die   Äpfel',
    q6: 'lebst',
  }

  const places = await takeTypedTest(
    page,
    (question) => typed[question.id] ?? rightAnswerText(question),
    Object.keys(typed),
  )

  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('15 of 15 right')
  await expect(page.getByRole('list', { name: 'Wrong answers' })).toHaveCount(0)

  const noted = page.getByRole('list', { name: 'Accepted with a note' }).getByRole('listitem')
  await expect(noted).toHaveCount(4)
  const placeOf = (id: string) => places.get(id) ?? 0
  const inOrder = ['q1', 'q2', 'q4', 'q8'].sort((a, b) => placeOf(a) - placeOf(b))
  const noteOf = (id: string) => noted.nth(inOrder.indexOf(id))

  // What was typed, the exact spelling, and which slip it was.
  await expect(noteOf('q1')).toContainText(`Question ${placeOf('q1')}`)
  await expect(noteOf('q1')).toContainText('Wir spielen ___.')
  await expect(noteOf('q1').getByRole('term')).toHaveText(['Your answer', 'Exact spelling'])
  await expect(noteOf('q1').getByRole('definition')).toHaveText(['fussball', 'Fußball'])
  await expect(noteOf('q1')).toContainText(SUBSTITUTE_NOTE)
  await expect(noteOf('q1')).toContainText(CAPITALS_NOTE)

  await expect(noteOf('q2').getByRole('definition')).toHaveText(['schoen', 'schön'])
  await expect(noteOf('q2')).toContainText(SUBSTITUTE_NOTE)
  await expect(noteOf('q2')).not.toContainText(CAPITALS_NOTE)

  await expect(noteOf('q4').getByRole('definition')).toHaveText(['mädchen', 'Mädchen'])
  await expect(noteOf('q4')).toContainText(CAPITALS_NOTE)
  await expect(noteOf('q4')).not.toContainText(SUBSTITUTE_NOTE)

  // The exact spelling is that of the accepted answer that was meant, here the second one.
  await expect(noteOf('q8').getByRole('definition')).toHaveText(['ueben', 'üben'])
})

test('a wrong typed answer is shown with what was typed, the right answer and its reason', async ({ page }) => {
  await page.goto(TYPED_TEST)
  // A plain letter in place of an umlaut is not a slip: it is wrong.
  const typed: Record<string, string> = { q2: 'schon', q11: 'die Fusse' }

  const places = await takeTypedTest(
    page,
    (question) => typed[question.id] ?? rightAnswerText(question),
    Object.keys(typed),
  )

  await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('13 of 15 right')
  const wrong = page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')
  await expect(wrong).toHaveCount(2)
  const pool = await fixturePool(TYPED_NODE)
  const placeOf = (id: string) => places.get(id) ?? 0
  for (const [index, id] of ['q2', 'q11'].sort((a, b) => placeOf(a) - placeOf(b)).entries()) {
    const question = pool.get(id)
    if (!question) throw new Error(`no question ${id}`)
    await expect(wrong.nth(index)).toContainText(`Question ${placeOf(id)}`)
    await expect(wrong.nth(index).getByRole('term')).toHaveText(['Your answer', 'Right answer'])
    await expect(wrong.nth(index).getByRole('definition')).toHaveText([String(typed[id]), rightAnswerText(question)])
    await expect(wrong.nth(index)).toContainText(asShown(question.explanation.en))
  }
  await expect(page.getByRole('heading', { name: 'Accepted with a note' })).toHaveCount(0)
})

test('on a Persian page the answer field and the letter buttons still read left to right', async ({
  page,
  hasTouch,
}) => {
  await page.goto(TYPED_TEST)
  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  const field = answerField(page)
  const letters = page.getByRole('group', { name: 'حروف آلمانی' }).getByRole('button')
  await expect(letters).toHaveText(['ä', 'ö', 'ü', 'ß'])
  const fromTheLeft = await Promise.all((await letters.all()).map(async (button) => (await button.boundingBox())?.x))
  expect(fromTheLeft).toEqual([...fromTheLeft].sort((a, b) => (a ?? 0) - (b ?? 0)))
  expect(await field.evaluate((input) => getComputedStyle(input).direction)).toBe('ltr')
  await expect(field).toHaveAttribute('lang', 'de')

  // The buttons and the field are in line: both start at the left edge of the question.
  const fieldBox = await field.boundingBox()
  expect(Math.round(fromTheLeft[0] ?? -1)).toBe(Math.round(fieldBox?.x ?? -2))

  const last = letters.nth(3)
  await (hasTouch ? last.tap() : last.click())
  await expect(field).toHaveValue('ß')
  await expect(page.getByRole('button', { name: 'بعدی' })).toBeInViewport()
  expect(await sidewaysScroll(page)).toBe(0)
})

test('the notes of a result are in the learner’s language and fit the screen', async ({ page }) => {
  await page.goto(TYPED_TEST)

  await takeTypedTest(page, (question) => (question.id === 'q7' ? 'strasse' : rightAnswerText(question)), ['q7'])

  await expect(page.getByRole('list', { name: 'Accepted with a note' }).getByRole('listitem')).toHaveCount(1)
  expect(await sidewaysScroll(page)).toBe(0)

  await page.getByRole('button', { name: 'فارسی' }).click()
  const noted = page.getByRole('list', { name: 'پذیرفته‌شده با یادداشت' }).getByRole('listitem')
  await expect(noted).toHaveCount(1)
  await expect(noted.getByRole('term')).toHaveText(['پاسخ شما', 'املای دقیق'])
  // The German in the note is German: left to right inside the Persian card.
  const exact = noted.getByRole('definition').getByText('Straße', { exact: true })
  await expect(exact).toHaveAttribute('lang', 'de')
  await expect(exact).toHaveAttribute('dir', 'ltr')
  expect(await sidewaysScroll(page)).toBe(0)

  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page.getByRole('list', { name: 'Richtig, mit Hinweis' }).getByRole('listitem')).toHaveCount(1)
})

import type { Locator, Page } from '@playwright/test'
import {
  ATTEMPT_SIZE,
  asShown,
  choice,
  ENGLISH,
  findQuestion,
  giveAnswer,
  orderGiven,
  PERSIAN,
  partnerOf,
  partnersGiven,
  rightAnswerText,
  sentenceOf,
  takeTest,
  wordOrder,
} from './taking-a-test.ts'
import { expect, test } from './test.ts'

const TEST = './#/node/grammar-001/test'

/** The one main button under the question at `place`. */
function goOn(page: Page, place: number, words = ENGLISH): Locator {
  return page.getByRole('button', { name: place < ATTEMPT_SIZE ? words.next : words.checkAnswers })
}

/** The wrong answers of the result: each with what was answered and what is right. */
function wrongAnswers(page: Page): Locator {
  return page.getByRole('list', { name: 'Wrong answers' }).getByRole('listitem')
}

/** Moves the keyboard to `target` with the Tab key alone. */
async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let presses = 0; presses < 40; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('the Tab key did not reach the element')
}

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

async function boxOf(element: Locator) {
  const box = await element.boundingBox()
  if (!box) throw new Error('the element is not on the page')
  return box
}

/** The smallest height a finger can hit comfortably (docs/design-direction.md). */
const TOUCH = 44

// ---------- word ordering ----------

test('a learner builds a sentence from its pieces, takes one back, and a wrong order comes back with the right sentence', async ({
  page,
}) => {
  await page.goto(TEST)
  const { question, place } = await findQuestion(page, 'word-order')
  const { placed, piece } = wordOrder(page)
  const [first = '', second = '', ...others] = orderGiven(question, 'wrong')

  // Nothing is placed yet, and the test does not move on.
  await expect(placed).toHaveCount(0)
  await expect(goOn(page, place)).toBeDisabled()

  // A piece goes to the end of the sentence. The sentence starts with a capital letter.
  await piece(first).click()
  await piece(second).click()
  await expect(placed).toHaveText([sentenceOf([first], ''), second])
  await expect(piece(second)).toHaveAttribute('aria-pressed', 'true')
  await expect(goOn(page, place)).toBeDisabled()

  // A placed piece is taken back by choosing it in the sentence.
  await placed.nth(1).click()
  await expect(placed).toHaveText([sentenceOf([first], '')])
  await expect(piece(second)).toHaveAttribute('aria-pressed', 'false')

  // Only a whole sentence can be handed in.
  await piece(second).click()
  for (const other of others) {
    await expect(goOn(page, place)).toBeDisabled()
    await piece(other).click()
  }
  await goOn(page, place).click()
  await takeTest(page, () => 'right', { from: place + 1 })

  await expect(page.getByRole('main')).toContainText('9 of 10 right')
  await expect(wrongAnswers(page)).toHaveCount(1)
  await expect(wrongAnswers(page).getByRole('definition')).toHaveText([
    sentenceOf([first, second, ...others], question.end),
    rightAnswerText(question),
  ])
  await expect(wrongAnswers(page)).toContainText(asShown(question.explanation.en))
})

test('a word ordering question is answered with the keyboard alone', async ({ page }) => {
  await page.goto(TEST)
  const { question, place } = await findQuestion(page, 'word-order')
  const { placed, piece } = wordOrder(page)
  const order = orderGiven(question, 'right')
  const [first = ''] = order

  // Enter or the space bar places a piece, and the keyboard stays on it.
  await tabTo(page, piece(first))
  await page.keyboard.press('Enter')
  await expect(placed).toHaveText([sentenceOf([first], '')])
  await expect(piece(first)).toBeFocused()

  // The same key takes it back.
  await page.keyboard.press('Space')
  await expect(placed).toHaveCount(0)
  await expect(piece(first)).toBeFocused()

  for (const text of order) {
    await tabTo(page, piece(text))
    await page.keyboard.press('Space')
  }
  await expect(placed).toHaveText([sentenceOf([first], ''), ...order.slice(1)])
  await tabTo(page, goOn(page, place))
  await page.keyboard.press('Enter')
  await takeTest(page, () => 'right', { from: place + 1 })

  await expect(page.getByRole('main')).toContainText('10 of 10 right')
})

// ---------- find the error ----------

test('a learner picks the wrong word of a sentence, and a wrong pick comes back with the right word', async ({
  page,
}) => {
  await page.goto(TEST)
  const { question, place } = await findQuestion(page, 'find-error')

  // Every word of the sentence can be picked, and one must be.
  await expect(page.getByRole('radio')).toHaveCount(question.prompt.split(' ').length)
  await expect(goOn(page, place)).toBeDisabled()

  // A pick can be changed until the learner moves on.
  await choice(page, question, 'right').check()
  await choice(page, question, 'wrong').check()
  await expect(choice(page, question, 'right')).not.toBeChecked()
  await goOn(page, place).click()
  await takeTest(page, () => 'right', { from: place + 1 })

  await expect(page.getByRole('main')).toContainText('9 of 10 right')
  await expect(wrongAnswers(page)).toHaveCount(1)
  await expect(wrongAnswers(page)).toContainText(question.prompt)
  await expect(wrongAnswers(page).getByRole('definition')).toHaveText([
    question.prompt.split(' ').find((word) => word !== question.answer) ?? '',
    question.answer,
  ])
  await expect(wrongAnswers(page)).toContainText(asShown(question.explanation.en))
})

// ---------- matching ----------

test('a learner gives each item its partner, and a wrong matching comes back with the right pairs', async ({
  page,
}) => {
  await page.goto(TEST)
  const { question, place } = await findQuestion(page, 'matching')
  const given = partnersGiven(question, 'wrong')
  const [[firstItem, firstPartner] = ['', ''], [secondItem] = ['']] = given

  await expect(page.getByRole('combobox')).toHaveCount(question.answer.length)
  await expect(goOn(page, place)).toBeDisabled()

  // A partner belongs to one item: given to a second item, it leaves the first.
  await partnerOf(page, firstItem).selectOption(firstPartner)
  await partnerOf(page, secondItem).selectOption(firstPartner)
  await expect(partnerOf(page, firstItem)).toHaveValue('')
  await expect(partnerOf(page, secondItem)).toHaveValue(firstPartner)

  // Only when every item has a partner can the answer be handed in.
  for (const [item, partner] of given) {
    await expect(goOn(page, place)).toBeDisabled()
    await partnerOf(page, item).selectOption(partner)
  }
  await goOn(page, place).click()
  await takeTest(page, () => 'right', { from: place + 1 })

  await expect(page.getByRole('main')).toContainText('9 of 10 right')
  await expect(wrongAnswers(page)).toHaveCount(1)
  await expect(wrongAnswers(page).getByRole('definition')).toHaveText([
    given.map(([item, partner]) => `${item} → ${partner}`).join(', '),
    rightAnswerText(question),
  ])
  await expect(wrongAnswers(page)).toContainText(asShown(question.explanation.en))
})

test('a matching answered right counts as right', async ({ page }) => {
  await page.goto(TEST)
  const { question, place } = await findQuestion(page, 'matching')

  await giveAnswer(page, question, 'right')
  await goOn(page, place).click()
  await takeTest(page, () => 'right', { from: place + 1 })

  await expect(page.getByRole('main')).toContainText('10 of 10 right')
})

// ---------- on a phone, and on a Persian page ----------

test('word ordering on a Persian page: the sentence reads left to right, fits the screen and suits a finger', async ({
  page,
}) => {
  await page.goto(TEST)
  await page.getByRole('button', { name: 'فارسی' }).click()
  const { question, place } = await findQuestion(page, 'word-order', PERSIAN)
  const { sentence, placed, pieces } = wordOrder(page, PERSIAN)

  for (const piece of await pieces.getByRole('button').all()) {
    expect((await boxOf(piece)).height).toBeGreaterThanOrEqual(TOUCH)
  }
  await giveAnswer(page, question, 'right', PERSIAN)

  // The first piece stands to the left of the second, and the closing mark comes last.
  const first = await boxOf(placed.nth(0))
  const second = await boxOf(placed.nth(1))
  const last = await boxOf(placed.last())
  const end = await boxOf(sentence.getByText(question.end ?? '.', { exact: true }))
  expect(first.x + first.width).toBeLessThanOrEqual(second.x)
  expect(last.x + last.width).toBeLessThanOrEqual(end.x)
  expect(first.height).toBeGreaterThanOrEqual(TOUCH)

  await expect(goOn(page, place, PERSIAN)).toBeInViewport()
  expect(await sidewaysScroll(page)).toBe(0)
})

test('find the error on a Persian page: the sentence reads left to right, fits the screen and suits a finger', async ({
  page,
}) => {
  await page.goto(TEST)
  await page.getByRole('button', { name: 'فارسی' }).click()
  const { place } = await findQuestion(page, 'find-error', PERSIAN)

  const words = page.getByRole('radio')
  const first = await boxOf(words.nth(0))
  const second = await boxOf(words.nth(1))
  expect(first.x + first.width).toBeLessThanOrEqual(second.x)
  for (const word of await words.all()) {
    const box = await boxOf(word)
    expect(box.height).toBeGreaterThanOrEqual(TOUCH)
    expect(box.width).toBeGreaterThanOrEqual(TOUCH)
  }

  await expect(goOn(page, place, PERSIAN)).toBeInViewport()
  expect(await sidewaysScroll(page)).toBe(0)
})

test('matching on a Persian page: each pair reads left to right, fits the screen and suits a finger', async ({
  page,
}) => {
  await page.goto(TEST)
  await page.getByRole('button', { name: 'فارسی' }).click()
  const { question, place } = await findQuestion(page, 'matching', PERSIAN)

  for (const [item] of question.answer) {
    const itemBox = await boxOf(page.getByRole('main').getByText(item, { exact: true }))
    const partnerBox = await boxOf(partnerOf(page, item))
    expect(itemBox.x + itemBox.width).toBeLessThanOrEqual(partnerBox.x)
    expect(partnerBox.height).toBeGreaterThanOrEqual(TOUCH)
  }
  await giveAnswer(page, question, 'right', PERSIAN)

  await expect(goOn(page, place, PERSIAN)).toBeInViewport()
  expect(await sidewaysScroll(page)).toBe(0)
})

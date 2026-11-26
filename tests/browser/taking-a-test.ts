/**
 * Helpers for journeys that take a node's test.
 *
 * The answer key comes from the fixture node file, read here on its own; the
 * app only ever gets the compiled bundle. Which question is on screen is told
 * by its "report a problem" link, which names the node and the question.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { parse } from 'yaml'
import { expect } from './test.ts'

export interface FixtureQuestion {
  id: string
  type: 'multiple-choice' | 'gap-fill' | 'true-false' | 'typed-answer' | 'typed-gap-fill'
  prompt: string
  options?: string[]
  /** The key of a question that is answered by choosing. */
  answer?: string | boolean
  /** The key of a question that is answered by typing: every accepted answer. */
  answers?: string[]
  explanation: { en: string; fa: string; de: string }
}

/** The fixture node whose pool is typed questions only. An attempt draws all 15 of them. */
export const TYPED_NODE = 'grammar-010'
export const TYPED_ATTEMPT_SIZE = 15

/** What a test types as a wrong answer: no fixture question accepts it. */
export const WRONG_TEXT = 'falsch'

/** The words of the test screens in one language. English unless a journey says otherwise. */
export interface TestWords {
  questionOf: (place: number, total: number) => string
  next: string
  checkAnswers: string
  correct: string
  notCorrect: string
}

export const ENGLISH: TestWords = {
  questionOf: (place, total) => `Question ${place} of ${total}`,
  next: 'Next',
  checkAnswers: 'Check answers',
  correct: 'Correct',
  notCorrect: 'Not correct',
}

export const PERSIAN: TestWords = {
  questionOf: (place, total) => `سؤال ${persianDigits(place)} از ${persianDigits(total)}`,
  next: 'بعدی',
  checkAnswers: 'بررسی پاسخ‌ها',
  correct: 'درست',
  notCorrect: 'نادرست',
}

function persianDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] ?? digit)
}

/** How many questions an attempt of the fixture node draws: the default of the node file format. */
export const ATTEMPT_SIZE = 10

/** The pool of a fixture node, by question id. "Fixture verbs" unless a journey says otherwise. */
export async function fixturePool(nodeId = 'grammar-001'): Promise<Map<string, FixtureQuestion>> {
  const file = fileURLToPath(new URL(`../fixtures/content/nodes/grammar/${nodeId}.yaml`, import.meta.url))
  const node = parse(await readFile(file, 'utf8')) as { questions: FixtureQuestion[] }
  return new Map(node.questions.map((question) => [question.id, question]))
}

/** The "report a problem" link of the question on screen, in any language. */
export function reportLink(scope: Page | Locator): Locator {
  return scope.locator('a[href*="/issues/new"]')
}

/** What the pre-filled issue behind a "report a problem" link says. */
export async function reportedIssue(link: Locator) {
  const address = new URL((await link.getAttribute('href')) ?? '')
  const title = address.searchParams.get('title') ?? ''
  const body = address.searchParams.get('body') ?? ''
  return {
    site: address.origin,
    path: address.pathname,
    title,
    body,
    node: /^Topic: (.+)$/m.exec(body)?.[1],
    question: /^Question: (.+)$/m.exec(body)?.[1],
  }
}

/** The fixture question that is on screen now. */
export async function questionOnScreen(page: Page): Promise<FixtureQuestion> {
  const { node, question } = await reportedIssue(reportLink(page))
  expect(node).toMatch(/^grammar-\d{3}$/)
  const found = (await fixturePool(node)).get(question ?? '')
  if (!found) throw new Error(`the question on screen (${question}) is not in the fixture pool`)
  return found
}

/** The radio button that answers `question` right or wrong. */
export function choice(page: Page, question: FixtureQuestion, how: 'right' | 'wrong', words = ENGLISH): Locator {
  if (question.type === 'true-false') {
    const saysCorrect = how === 'right' ? question.answer === true : question.answer !== true
    return page.getByRole('radio', { name: saysCorrect ? words.correct : words.notCorrect, exact: true })
  }
  const option = how === 'right' ? question.answer : question.options?.find((other) => other !== question.answer)
  return page.getByRole('radio', { name: String(option), exact: true })
}

/** Whether the question on screen is answered by typing. */
export function isTyped(question: FixtureQuestion): boolean {
  return question.type === 'typed-answer' || question.type === 'typed-gap-fill'
}

/** The field a typed question is answered in. */
export function answerField(page: Page): Locator {
  return page.getByRole('textbox')
}

/** Answers the question on screen right or wrong: by choosing, or by typing. */
export async function giveAnswer(page: Page, question: FixtureQuestion, how: 'right' | 'wrong', words = ENGLISH) {
  if (isTyped(question)) {
    await answerField(page).fill(how === 'right' ? rightAnswerText(question) : WRONG_TEXT)
  } else {
    await choice(page, question, how, words).check()
  }
}

/** The right answer of a question, as the result shows it. */
export function rightAnswerText(question: FixtureQuestion, words = ENGLISH): string {
  if (question.type === 'true-false') return question.answer ? words.correct : words.notCorrect
  if (isTyped(question)) return String(question.answers?.[0])
  return String(question.answer)
}

/**
 * Takes the rest of a test: answers every question from place `from` to the
 * last one and asks for the result. Returns the questions it met, in order.
 */
export async function takeTest(
  page: Page,
  how: (place: number) => 'right' | 'wrong',
  { from = 1, words = ENGLISH, size = ATTEMPT_SIZE }: { from?: number; words?: TestWords; size?: number } = {},
): Promise<FixtureQuestion[]> {
  const met: FixtureQuestion[] = []
  for (let place = from; place <= size; place += 1) {
    await expect(page.getByText(words.questionOf(place, size))).toBeVisible()
    const question = await questionOnScreen(page)
    met.push(question)
    await giveAnswer(page, question, how(place), words)
    await page.getByRole('button', { name: place < size ? words.next : words.checkAnswers }).click()
  }
  return met
}

/**
 * Takes the whole test of the typed fixture node, typing for each question
 * what `text` gives for it. Returns the place (from 1) at which each question
 * came, by question id.
 */
export async function takeTypedTest(
  page: Page,
  text: (question: FixtureQuestion) => string,
  words = ENGLISH,
): Promise<Map<string, number>> {
  const places = new Map<string, number>()
  for (let place = 1; place <= TYPED_ATTEMPT_SIZE; place += 1) {
    await expect(page.getByText(words.questionOf(place, TYPED_ATTEMPT_SIZE))).toBeVisible()
    const question = await questionOnScreen(page)
    places.set(question.id, place)
    await answerField(page).fill(text(question))
    await page.getByRole('button', { name: place < TYPED_ATTEMPT_SIZE ? words.next : words.checkAnswers }).click()
  }
  return places
}

/** An explanation as a learner reads it: the asterisks that mark German are not shown. */
export function asShown(explanation: string): string {
  return explanation.replaceAll('*', '')
}

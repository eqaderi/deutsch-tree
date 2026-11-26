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
  type: 'multiple-choice' | 'gap-fill' | 'true-false'
  prompt: string
  options?: string[]
  answer: string | boolean
  explanation: { en: string; fa: string; de: string }
}

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

/** The pool of the fixture node "Fixture verbs", by question id. */
export async function fixturePool(): Promise<Map<string, FixtureQuestion>> {
  const file = fileURLToPath(new URL('../fixtures/content/nodes/grammar/grammar-001.yaml', import.meta.url))
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
  expect(node).toBe('grammar-001')
  const found = (await fixturePool()).get(question ?? '')
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

/** The right answer of a question, as the result shows it. */
export function rightAnswerText(question: FixtureQuestion, words = ENGLISH): string {
  if (question.type === 'true-false') return question.answer ? words.correct : words.notCorrect
  return String(question.answer)
}

/**
 * Takes the rest of a test: answers every question from place `from` to the
 * last one and asks for the result. Returns the questions it met, in order.
 */
export async function takeTest(
  page: Page,
  how: (place: number) => 'right' | 'wrong',
  { from = 1, words = ENGLISH }: { from?: number; words?: TestWords } = {},
): Promise<FixtureQuestion[]> {
  const met: FixtureQuestion[] = []
  for (let place = from; place <= ATTEMPT_SIZE; place += 1) {
    await expect(page.getByText(words.questionOf(place, ATTEMPT_SIZE))).toBeVisible()
    const question = await questionOnScreen(page)
    met.push(question)
    await choice(page, question, how(place), words).check()
    await page.getByRole('button', { name: place < ATTEMPT_SIZE ? words.next : words.checkAnswers }).click()
  }
  return met
}

/** An explanation as a learner reads it: the asterisks that mark German are not shown. */
export function asShown(explanation: string): string {
  return explanation.replaceAll('*', '')
}

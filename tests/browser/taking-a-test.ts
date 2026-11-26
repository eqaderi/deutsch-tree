/**
 * Helpers for journeys that take a node's test or a level's checkpoint.
 *
 * The answer key comes from the fixture node files, read here on their own;
 * the app only ever gets the compiled bundle. Which question is on screen is
 * told by its "report a problem" link, which names the node and the question.
 */
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { parse } from 'yaml'
import { expect } from './test.ts'

export interface FixtureQuestion {
  /** The fixture node the question belongs to. */
  node: string
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

/** The node whose test most journeys take: "Fixture verbs". */
export const FIXTURE_NODE = 'grammar-001'

/** Every question of the fixture nodes, by node and question id ("grammar-001/q1"). */
export async function fixtureQuestions(): Promise<Map<string, FixtureQuestion>> {
  const folder = fileURLToPath(new URL('../fixtures/content/nodes/', import.meta.url))
  const questions = new Map<string, FixtureQuestion>()
  for (const file of await readdir(folder, { recursive: true })) {
    if (!file.endsWith('.yaml')) continue
    const node = parse(await readFile(`${folder}${file}`, 'utf8')) as { id: string; questions?: FixtureQuestion[] }
    for (const question of node.questions ?? []) {
      questions.set(`${node.id}/${question.id}`, { ...question, node: node.id })
    }
  }
  return questions
}

/** The pool of one fixture node, by question id. "Fixture verbs" unless a journey says otherwise. */
export async function fixturePool(nodeId = FIXTURE_NODE): Promise<Map<string, FixtureQuestion>> {
  const ofNode = [...(await fixtureQuestions()).values()].filter((question) => question.node === nodeId)
  return new Map(ofNode.map((question) => [question.id, question]))
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
  const found = (await fixtureQuestions()).get(`${node}/${question}`)
  if (!found) throw new Error(`the question on screen (${question} of ${node}) is not in the fixture content`)
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

interface TakeTestOptions {
  from?: number
  words?: TestWords
  /** How many questions the test has. */
  total?: number
  /** The node every question must come from; null for a checkpoint, which asks several nodes. */
  node?: string | null
}

/**
 * Takes the rest of a test: answers every question from place `from` to the
 * last one and asks for the result. Returns the questions it met, in order.
 */
export async function takeTest(
  page: Page,
  how: (place: number, question: FixtureQuestion) => 'right' | 'wrong',
  { from = 1, words = ENGLISH, total = ATTEMPT_SIZE, node = FIXTURE_NODE }: TakeTestOptions = {},
): Promise<FixtureQuestion[]> {
  const met: FixtureQuestion[] = []
  for (let place = from; place <= total; place += 1) {
    await expect(page.getByText(words.questionOf(place, total))).toBeVisible()
    const question = await questionOnScreen(page)
    if (node !== null) expect(question.node).toBe(node)
    met.push(question)
    await giveAnswer(page, question, how(place, question), words)
    await page.getByRole('button', { name: place < total ? words.next : words.checkAnswers }).click()
  }
  return met
}

/** Takes a level's checkpoint of `total` questions from its first question to its result. */
export function takeCheckpoint(
  page: Page,
  total: number,
  how: (place: number, question: FixtureQuestion) => 'right' | 'wrong',
  words = ENGLISH,
): Promise<FixtureQuestion[]> {
  return takeTest(page, how, { total, words, node: null })
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

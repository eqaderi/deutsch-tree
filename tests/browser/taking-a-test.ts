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

interface FixtureQuestionBase {
  id: string
  explanation: { en: string; fa: string; de: string }
}

/** A question of the fixture node, as its node file states it. */
export type FixtureQuestion = FixtureQuestionBase &
  (
    | { type: 'multiple-choice' | 'gap-fill'; prompt: string; options: string[]; answer: string }
    | { type: 'true-false'; prompt: string; answer: boolean }
    | { type: 'find-error'; prompt: string; answer: string }
    | { type: 'word-order'; answer: string[]; alsoAccepted?: string[][]; end?: string }
    | { type: 'matching'; answer: Array<[item: string, partner: string]> }
  )

export type FixtureQuestionOf<Type extends FixtureQuestion['type']> = Extract<FixtureQuestion, { type: Type }>

/** The words of the test screens in one language. English unless a journey says otherwise. */
export interface TestWords {
  questionOf: (place: number, total: number) => string
  next: string
  checkAnswers: string
  tryAgain: string
  correct: string
  notCorrect: string
  /** Names the line on which a word ordering sentence is built. */
  yourSentence: string
  /** Names the pieces of a word ordering question. */
  wordsToPlace: string
}

export const ENGLISH: TestWords = {
  questionOf: (place, total) => `Question ${place} of ${total}`,
  next: 'Next',
  checkAnswers: 'Check answers',
  tryAgain: 'Try again',
  correct: 'Correct',
  notCorrect: 'Not correct',
  yourSentence: 'Your sentence',
  wordsToPlace: 'Words',
}

export const PERSIAN: TestWords = {
  questionOf: (place, total) => `سؤال ${persianDigits(place)} از ${persianDigits(total)}`,
  next: 'بعدی',
  checkAnswers: 'بررسی پاسخ‌ها',
  tryAgain: 'تلاش دوباره',
  correct: 'درست',
  notCorrect: 'نادرست',
  yourSentence: 'جملهٔ شما',
  wordsToPlace: 'واژه‌ها',
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

/** The German that a question puts in front of the learner: its sentence, its pieces or its items. */
export function germanShown(question: FixtureQuestion): string[] {
  if (question.type === 'word-order') return question.answer
  if (question.type === 'matching') return question.answer.map(([item]) => item)
  return [question.prompt]
}

// ---------- answering ----------

/** The radio button that answers `question` right or wrong, for the types that are answered with one. */
export function choice(page: Page, question: FixtureQuestion, how: 'right' | 'wrong', words = ENGLISH): Locator {
  const radio = (name: string) => page.getByRole('radio', { name, exact: true })
  switch (question.type) {
    case 'true-false': {
      const saysCorrect = how === 'right' ? question.answer : !question.answer
      return radio(saysCorrect ? words.correct : words.notCorrect)
    }
    case 'multiple-choice':
    case 'gap-fill':
      return radio(how === 'right' ? question.answer : otherThan(question.answer, question.options))
    case 'find-error':
      // Every word of the sentence is a choice; the right one is the wrong word.
      return radio(how === 'right' ? question.answer : otherThan(question.answer, question.prompt.match(/\p{L}+/gu)))
    default:
      throw new Error(`a ${question.type} question is not answered with one radio button`)
  }
}

function otherThan(answer: string, offered: string[] | null | undefined): string {
  const other = offered?.find((candidate) => candidate !== answer)
  if (other === undefined) throw new Error(`nothing but "${answer}" to choose`)
  return other
}

/** The line on which a word ordering sentence is built, and the pieces it is built from. */
export function wordOrder(page: Page, words = ENGLISH) {
  const sentence = page.getByRole('group', { name: words.yourSentence, exact: true })
  const pieces = page.getByRole('group', { name: words.wordsToPlace, exact: true })
  return {
    sentence,
    /** The pieces placed so far, in their order. */
    placed: sentence.getByRole('button'),
    pieces,
    piece: (text: string) => pieces.getByRole('button', { name: text, exact: true }),
  }
}

/** The order in which a word ordering question is answered right or wrong. */
export function orderGiven(question: FixtureQuestionOf<'word-order'>, how: 'right' | 'wrong'): string[] {
  if (how === 'right') return question.answer
  const right = [question.answer, ...(question.alsoAccepted ?? [])].map((order) => order.join('|'))
  const [first = '', ...rest] = question.answer
  // The first piece moved back by one place, then by two, and so on, until the order is a wrong one.
  for (let place = 1; place <= rest.length; place += 1) {
    const order = rest.toSpliced(place, 0, first)
    if (!right.includes(order.join('|'))) return order
  }
  throw new Error(`no wrong order found for ${question.id}`)
}

/** A word ordering sentence as the app writes it: a capital letter at the start, the closing mark at the end. */
export function sentenceOf(order: string[], end = '.'): string {
  const text = order.join(' ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}${end}`
}

/** The partner that each item of a matching question is given, right or wrong. */
export function partnersGiven(
  question: FixtureQuestionOf<'matching'>,
  how: 'right' | 'wrong',
): Array<[item: string, partner: string]> {
  const partners = question.answer.map(([, partner]) => partner)
  // Wrong: every item gets the partner of the next one.
  const given = how === 'right' ? partners : [...partners.slice(1), ...partners.slice(0, 1)]
  return question.answer.map(([item], index) => [item, given[index] ?? ''])
}

/** The list in which the partner of one item of a matching question is chosen. */
export function partnerOf(page: Page, item: string): Locator {
  return page.getByRole('combobox', { name: item, exact: true })
}

/** Answers the question on screen, right or wrong, the way a learner does. */
export async function giveAnswer(
  page: Page,
  question: FixtureQuestion,
  how: 'right' | 'wrong',
  words = ENGLISH,
): Promise<void> {
  switch (question.type) {
    case 'word-order':
      for (const piece of orderGiven(question, how)) await wordOrder(page, words).piece(piece).click()
      return
    case 'matching':
      for (const [item, partner] of partnersGiven(question, how)) await partnerOf(page, item).selectOption(partner)
      return
    default:
      await choice(page, question, how, words).check()
  }
}

/** Expects the question on screen to show the answer that `giveAnswer` gave. */
export async function expectAnswerGiven(
  page: Page,
  question: FixtureQuestion,
  how: 'right' | 'wrong',
  words = ENGLISH,
): Promise<void> {
  switch (question.type) {
    case 'word-order': {
      const [first = '', ...rest] = orderGiven(question, how)
      await expect(wordOrder(page, words).placed).toHaveText([sentenceOf([first], ''), ...rest])
      return
    }
    case 'matching':
      for (const [item, partner] of partnersGiven(question, how)) {
        await expect(partnerOf(page, item)).toHaveValue(partner)
      }
      return
    default:
      await expect(choice(page, question, how, words)).toBeChecked()
  }
}

/** The right answer of a question, as the result shows it. */
export function rightAnswerText(question: FixtureQuestion, words = ENGLISH): string {
  switch (question.type) {
    case 'true-false':
      return question.answer ? words.correct : words.notCorrect
    case 'word-order':
      return sentenceOf(question.answer, question.end)
    case 'matching':
      return question.answer.map(([item, partner]) => `${item} → ${partner}`).join(', ')
    default:
      return question.answer
  }
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
    await giveAnswer(page, question, how(place), words)
    await page.getByRole('button', { name: place < ATTEMPT_SIZE ? words.next : words.checkAnswers }).click()
  }
  return met
}

/**
 * Brings a question of one type on screen and leaves it unanswered. An
 * attempt draws its questions by chance, so this answers the questions before
 * it (right), and starts another attempt when one ends without the type.
 * Returns the question and its place in the attempt.
 */
export async function findQuestion<Type extends FixtureQuestion['type']>(
  page: Page,
  type: Type,
  words = ENGLISH,
): Promise<{ question: FixtureQuestionOf<Type>; place: number }> {
  // A type with one question in the pool is in about half of the attempts.
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    for (let place = 1; place <= ATTEMPT_SIZE; place += 1) {
      await expect(page.getByText(words.questionOf(place, ATTEMPT_SIZE))).toBeVisible()
      const question = await questionOnScreen(page)
      if (question.type === type) return { question: question as FixtureQuestionOf<Type>, place }
      await giveAnswer(page, question, 'right', words)
      await page.getByRole('button', { name: place < ATTEMPT_SIZE ? words.next : words.checkAnswers }).click()
    }
    await page.getByRole('button', { name: words.tryAgain }).click()
  }
  throw new Error(`no ${type} question came up in 40 attempts`)
}

/** An explanation as a learner reads it: the asterisks that mark German are not shown. */
export function asShown(explanation: string): string {
  return explanation.replaceAll('*', '')
}

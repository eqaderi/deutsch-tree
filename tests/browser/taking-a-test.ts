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
import { type Language, nodeFileSchema, type RichText } from '../../src/content-model/index.ts'
import { vocabularyQuestions } from '../../src/content-pipeline/vocabulary.ts'
import { expect } from './test.ts'

interface FixtureQuestionBase {
  /** The fixture node the question belongs to. */
  node: string
  id: string
  explanation: { en: string; fa: string; de: string }
}

/** A question of a fixture node, as its node file states it. */
export type FixtureQuestion = FixtureQuestionBase &
  (
    | { type: 'multiple-choice' | 'gap-fill'; prompt: string; options: string[]; answer: string }
    | { type: 'true-false'; prompt: string; answer: boolean }
    // Answered by typing: `answers` is every accepted answer.
    | { type: 'typed-answer' | 'typed-gap-fill'; prompt: string; answers: string[] }
    | { type: 'find-error'; prompt: string; answer: string }
    // Every right order of the pieces; the first is the one a result shows.
    | { type: 'word-order'; answers: string[][]; end?: string }
    | { type: 'matching'; answer: Array<[item: string, partner: string]> }
    // Made from the words of a vocabulary node: from German (choose the meaning) and into German (type the word).
    | {
        type: 'meaning-of-word'
        word: string
        prompt: string
        options: Array<{ word: string; meaning: Record<Language, string> }>
        answer: string
      }
    | { type: 'word-for-meaning'; word: string; prompt: Record<Language, string>; answers: string[] }
  )

export type FixtureQuestionOf<Type extends FixtureQuestion['type']> = Extract<FixtureQuestion, { type: Type }>

/** The fixture node whose pool is typed questions only. An attempt draws 15 of its 16. */
export const TYPED_NODE = 'grammar-010'
export const TYPED_ATTEMPT_SIZE = 15

/** What a test types as a wrong answer: no fixture question accepts it. */
export const WRONG_TEXT = 'falsch'

/** The words of the test screens in one language. English unless a journey says otherwise. */
export interface TestWords {
  /** The language of the page: a vocabulary question offers meanings in it. */
  language: Language
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
  language: 'en',
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
  language: 'fa',
  questionOf: (place, total) => `پرسش ${persianDigits(place)} از ${persianDigits(total)}`,
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

/** The node whose test most journeys take: "Fixture verbs". */
export const FIXTURE_NODE = 'grammar-001'

/**
 * Every question of the fixture nodes, by node and question id
 * ("grammar-001/q1"). The pool of a vocabulary node is made from its words,
 * the same way the content pipeline makes it.
 */
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
  const vocabulary = fileURLToPath(new URL('../fixtures/content/nodes/vocabulary/', import.meta.url))
  for (const file of await readdir(vocabulary)) {
    const node = nodeFileSchema.parse(parse(await readFile(`${vocabulary}${file}`, 'utf8')))
    for (const question of vocabularyQuestions(node)) {
      if (question.type !== 'meaning-of-word' && question.type !== 'word-for-meaning') continue
      const explanation = {
        en: plain(question.explanation.en),
        fa: plain(question.explanation.fa),
        de: plain(question.explanation.de),
      }
      questions.set(`${node.id}/${question.id}`, { ...question, explanation, node: node.id })
    }
  }
  return questions
}

/** Rich text as a fixture file writes it: German in asterisks. */
function plain(parts: RichText): string {
  return parts.map((part) => (typeof part === 'string' ? part : `*${part.de}*`)).join('')
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

/** The German that a question puts in front of the learner: its sentence, its pieces or its items. */
export function germanShown(question: FixtureQuestion): string[] {
  if (question.type === 'word-order') return question.answers[0] ?? []
  if (question.type === 'matching') return question.answer.map(([item]) => item)
  // Into German, the learner reads a meaning: the German is what they type.
  if (question.type === 'word-for-meaning') return []
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
    case 'meaning-of-word': {
      // Each option is the meaning of a word, in the language of the page.
      const meaning = (word: string) => question.options.find((option) => option.word === word)?.meaning[words.language]
      const others = question.options.map((option) => option.word)
      return radio(meaning(how === 'right' ? question.answer : otherThan(question.answer, others)) ?? '')
    }
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
  const [shown = []] = question.answers
  if (how === 'right') return shown
  const right = question.answers.map((order) => order.join('|'))
  const [first = '', ...rest] = shown
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

/** Whether the question on screen is answered by typing. */
export function isTyped(question: FixtureQuestion): question is FixtureQuestionOf<'typed-answer' | 'typed-gap-fill'> {
  return question.type === 'typed-answer' || question.type === 'typed-gap-fill'
}

/** The field a typed question is answered in. */
export function answerField(page: Page): Locator {
  return page.getByRole('textbox')
}

/** What `giveAnswer` types into the field of a typed question. */
function textGiven(question: FixtureQuestion, how: 'right' | 'wrong'): string {
  return how === 'right' ? rightAnswerText(question) : WRONG_TEXT
}

/** Answers the question on screen, right or wrong, the way a learner does: by choosing, typing, ordering or matching. */
export async function giveAnswer(
  page: Page,
  question: FixtureQuestion,
  how: 'right' | 'wrong',
  words = ENGLISH,
): Promise<void> {
  switch (question.type) {
    case 'typed-answer':
    case 'typed-gap-fill':
    case 'word-for-meaning':
      await answerField(page).fill(textGiven(question, how))
      return
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
    case 'typed-answer':
    case 'typed-gap-fill':
    case 'word-for-meaning':
      await expect(answerField(page)).toHaveValue(textGiven(question, how))
      return
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
    case 'typed-answer':
    case 'typed-gap-fill':
    case 'word-for-meaning':
      // The first accepted answer is the one a result shows.
      return String(question.answers[0])
    case 'meaning-of-word':
      return question.options.find((option) => option.word === question.answer)?.meaning[words.language] ?? ''
    case 'word-order':
      return sentenceOf(orderGiven(question, 'right'), question.end)
    case 'matching':
      return question.answer.map(([item, partner]) => `${item} → ${partner}`).join(', ')
    default:
      return question.answer
  }
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

/**
 * Takes the whole test of the typed fixture node, typing for each question
 * what `text` gives for it. An attempt leaves one question of the pool out,
 * so when one of the questions in `needs` did not come up, this takes another
 * attempt, until one held them all. Returns the place (from 1) at which each
 * question of that attempt came, by question id.
 */
export async function takeTypedTest(
  page: Page,
  text: (question: FixtureQuestion) => string,
  needs: readonly string[] = [],
  words = ENGLISH,
): Promise<Map<string, number>> {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    if (attempt > 1) await page.getByRole('button', { name: words.tryAgain }).click()
    const places = new Map<string, number>()
    for (let place = 1; place <= TYPED_ATTEMPT_SIZE; place += 1) {
      await expect(page.getByText(words.questionOf(place, TYPED_ATTEMPT_SIZE))).toBeVisible()
      const question = await questionOnScreen(page)
      places.set(question.id, place)
      await answerField(page).fill(text(question))
      await page.getByRole('button', { name: place < TYPED_ATTEMPT_SIZE ? words.next : words.checkAnswers }).click()
    }
    if (needs.every((id) => places.has(id))) return places
  }
  throw new Error(`no attempt in 20 held all of ${needs.join(', ')}`)
}

/** An explanation as a learner reads it: the asterisks that mark German are not shown. */
export function asShown(explanation: string): string {
  return explanation.replaceAll('*', '')
}

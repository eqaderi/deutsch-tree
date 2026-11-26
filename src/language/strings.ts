import type { NodeKind, Question } from '../content-model/index.ts'
import type { AnswerNote } from '../learning-engine/index.ts'

/**
 * Every word the interface shows. Components never hold their own wording;
 * they read it from here through `useLanguage()`.
 *
 * To add a string: add it here in English, then to `strings.fa.ts` (Persian)
 * and `strings.de.ts` (simple German, about A2 level). `pnpm check` fails
 * until all three have it. A string that holds a number is a function, so
 * that Persian can write the number in Persian digits.
 */
export const en = {
  appName: 'deutsch-tree',
  language: 'Language',
  /** A whole number as this language writes it. Use it for every number shown on its own. */
  number: (value: number) => String(value),
  loading: 'Loading…',
  loadFailed: 'This page could not be loaded. Check your connection and try again.',
  tryAgain: 'Try again',

  treeTitle: 'German from zero to B1',
  treeIntro:
    'Everything you need for the Goethe B1 exam, as one tree of small topics. Each topic has a short explanation and a test.',
  levels: 'Levels',
  routeStart: 'Start',
  routeExam: 'Exam',
  levelNames: { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate' } as Record<string, string | undefined>,
  topicCount: (count: number) => (count === 1 ? '1 topic' : `${count} topics`),
  kinds: {
    grammar: 'Grammar',
    vocabulary: 'Vocabulary',
    phrases: 'Phrases',
    'exam-part': 'Exam parts',
  } satisfies Record<NodeKind, string>,
  start: 'Start',
  comingSoon: 'Coming soon',
  done: 'Done',

  allTopics: 'All topics',
  rule: 'Rule',
  table: 'Table',
  examples: 'Examples',
  commonMistakes: 'Common mistakes',
  wrong: 'Wrong',
  right: 'Right',
  test: 'Test',
  takeTheTest: 'Take the test',
  comingSoonPage: 'This topic is not written yet. It will appear here when it is ready.',
  notFoundTitle: 'Topic not found',
  notFoundText: 'There is no topic at this address.',

  backToTopic: 'Back to the topic',
  testTitle: (title: string) => `Test: ${title}`,
  // A node's test: one question per screen, then the result.
  questionOf: (place: number, total: number) => `Question ${place} of ${total}`,
  questionNumber: (place: number) => `Question ${place}`,
  instructions: {
    'multiple-choice': 'Choose the right answer.',
    'gap-fill': 'Choose the word that fits the gap.',
    'true-false': 'Is this sentence correct German?',
    'typed-answer': 'Type the answer.',
    'typed-gap-fill': 'Type the word that fits the gap.',
  } satisfies Record<Question['type'], string>,
  /** Read out in place of an empty gap. */
  gap: 'gap',
  sentenceCorrect: 'Correct',
  sentenceNotCorrect: 'Not correct',
  /** The name of the buttons that write ä, ö, ü and ß into a typed answer. */
  germanLetters: 'German letters',
  next: 'Next',
  checkAnswers: 'Check answers',
  reportProblem: 'Report a problem',

  passed: 'Passed',
  notPassed: 'Not passed yet',
  /** Follows the number of right answers, which is shown large: "9 of 10 right". */
  ofTotalRight: (total: number) => `of ${total} right`,
  neededToPass: (passMark: number, total: number) => `You need ${passMark} of ${total} right to pass.`,
  topicNowDone: 'This topic is now done.',
  topicStaysDone: 'This topic was already done. It stays done.',
  retryAnyTime: 'You can try as often as you like. Every test draws new questions.',
  wrongAnswers: 'Wrong answers',
  yourAnswer: 'Your answer',
  rightAnswer: 'Right answer',
  // Typed answers that counted as right although they were not written exactly.
  acceptedWithNote: 'Accepted with a note',
  exactSpelling: 'Exact spelling',
  answerNotes: {
    'umlaut-substitute': 'Accepted. The exact spelling has ä, ö, ü or ß.',
    capitalisation: 'Accepted. Mind the capital and small letters.',
  } satisfies Record<AnswerNote, string>,
}

/** The shape of `en` with the wording left open: every key, any text. */
type Wording<T> = T extends (...args: infer Args) => string
  ? (...args: Args) => string
  : T extends string
    ? string
    : { [Key in keyof T]: Wording<T[Key]> }

/** What every language must provide. A key missing in one language is a type error. */
export type Strings = Wording<typeof en>

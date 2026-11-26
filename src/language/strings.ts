import type { NodeKind } from '../content-model/index.ts'

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
  questionsInPool: (count: number) => (count === 1 ? 'question in the pool' : 'questions in the pool'),
  testNotReady: 'Tests cannot be taken yet. They are being built.',
}

/** The shape of `en` with the wording left open: every key, any text. */
type Wording<T> = T extends (...args: infer Args) => string
  ? (...args: Args) => string
  : T extends string
    ? string
    : { [Key in keyof T]: Wording<T[Key]> }

/** What every language must provide. A key missing in one language is a type error. */
export type Strings = Wording<typeof en>

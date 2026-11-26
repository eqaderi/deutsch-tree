import type { NodeKind, Question } from '../content-model/index.ts'

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
  /** The state word of a topic that is in progress, as the tree writes it. */
  continueTopic: 'Continue',

  // Finding the way in the tree: the first visit, the next topic, the filter and the counts.
  howItWorks: 'How it works',
  firstSteps: {
    pick: 'Pick a topic.',
    read: 'Read it, or go straight to the test.',
    pass: (percent: number) => `Score ${percent}% and the topic is done.`,
  },
  gotIt: 'Got it',
  yourNextTopic: 'Your next topic',
  nothingNext: 'You have done every topic that is written so far. New topics appear in the tree when they are ready.',
  youAreHere: 'You are here',
  kindsOfTopic: 'Kinds of topic',
  allKinds: 'All kinds',
  doneCount: (done: number) => `${done} done`,
  /** Topics that are not done yet, written or not. */
  leftCount: (left: number) => `${left} left`,
  /** The counts of a level: done, left, and how many of those left are not written yet. */
  countsSummary: (done: number, left: number, comingSoon: number) =>
    comingSoon === 0 ? `${done} done · ${left} left` : `${done} done · ${left} left, ${comingSoon} of them coming soon`,
  doneOfTotal: (done: number, total: number) => `${done} of ${total} done`,
  comingSoonCount: (count: number) => `${count} coming soon`,
  noTopicsHere: 'This level has no topics of this kind.',

  // A topic's page: what it builds on, and un-marking.
  buildsOn: 'Builds on',
  buildsOnNote: 'Nothing is locked. These topics help if this one feels too hard.',
  unmark: 'Mark as not done',
  unmarkQuestion: 'Mark this topic as not done? It stays that way until you pass it again.',
  unmarkConfirm: 'Yes, mark as not done',
  keepDone: 'Keep it done',
  unmarked: 'This topic is not done any more.',

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
  } satisfies Record<Question['type'], string>,
  /** Read out in place of an empty gap. */
  gap: 'gap',
  sentenceCorrect: 'Correct',
  sentenceNotCorrect: 'Not correct',
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
}

/** The shape of `en` with the wording left open: every key, any text. */
type Wording<T> = T extends (...args: infer Args) => string
  ? (...args: Args) => string
  : T extends string
    ? string
    : { [Key in keyof T]: Wording<T[Key]> }

/** What every language must provide. A key missing in one language is a type error. */
export type Strings = Wording<typeof en>

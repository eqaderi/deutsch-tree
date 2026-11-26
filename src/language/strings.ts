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

  // A level's checkpoint: a test across the topics of the level. It is advice and changes no topic.
  checkpoint: 'Checkpoint',
  checkpointTitle: (level: string) => `${level} checkpoint`,
  checkpointIntro:
    'A short test with questions from the topics of this level. It shows you what to look at again. It changes nothing in your topics.',
  startCheckpoint: 'Start the checkpoint',
  checkpointNothingYet: 'No topic of this level has a test yet. The checkpoint comes with the first one.',
  checkpointSize: (questions: number, topics: number) =>
    `${questions === 1 ? '1 question' : `${questions} questions`} from ${topics === 1 ? '1 topic' : `${topics} topics`}`,
  checkpointResult: 'Checkpoint result',
  checkpointAllRight: 'Everything was right. There is nothing to look at again.',
  checkpointSomeWrong: 'Some answers were wrong. The topics below are worth another look.',
  checkpointChangesNothing: 'A checkpoint only shows where you stand. Your topics stay as they are.',
  topicsToRevisit: 'Topics to look at again',
  /** Beside a topic in that list: "2 of 5 wrong". */
  wrongOfAsked: (wrong: number, asked: number) => `${wrong} of ${asked} wrong`,
}

/** The shape of `en` with the wording left open: every key, any text. */
type Wording<T> = T extends (...args: infer Args) => string
  ? (...args: Args) => string
  : T extends string
    ? string
    : { [Key in keyof T]: Wording<T[Key]> }

/** What every language must provide. A key missing in one language is a type error. */
export type Strings = Wording<typeof en>

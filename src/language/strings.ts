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

  // A writing or speaking node: the task, a prompt for an AI assistant, and the score typed back in.
  task: 'Task',
  getYourScore: 'How to get your score',
  writingSteps: [
    'Write your text for this task, as in the exam: without a dictionary and without a translator.',
    'Copy the prompt and paste it into an AI assistant, for example ChatGPT, Claude or Gemini. Put your text below it and send both.',
    'The assistant grades your text with the official criteria of the exam. Type its score into the box below.',
  ],
  speakingSteps: [
    'Copy the prompt and paste it into an AI assistant that can talk, for example ChatGPT, Claude or Gemini. Send it.',
    'Switch the assistant to voice mode and say “Hallo”. It speaks German with you, as in the exam. Speak; do not type.',
    'At the end the assistant grades you with the official criteria of the exam. Type its score into the box below.',
  ],
  copyPrompt: 'Copy the prompt',
  promptCopied: 'Copied. Now paste it into your AI assistant.',
  promptNotCopied: 'Your browser did not allow copying. Select the whole prompt below and copy it yourself.',
  readPrompt: 'Read the prompt',
  thePrompt: 'The prompt',
  /** Says which language the assistant answers in: the language of this very file. */
  promptNote:
    'The prompt is in English and German, because an assistant follows it best that way. It tells the assistant to grade strictly and to answer you in English. This app sends nothing anywhere; it only copies the text.',
  pronunciationNote:
    '16 of the 100 points are for pronunciation. An assistant can judge pronunciation only roughly, so take that part of the score as an estimate.',
  yourScore: 'Your score',
  noScoreYet: 'No score yet.',
  scoreLabel: 'Score from the assistant, from 0 to 100',
  saveScore: 'Save the score',
  scoreNotValid: 'Type a whole number from 0 to 100.',
  /** Follows a score, which is shown large: "93 of 100". */
  ofTotal: (total: number) => `of ${total}`,
  scoreNeeded: (needed: number, total: number) => `You need ${needed} of ${total} to finish this topic.`,
  scoreRetry: 'Do the task again and enter the new score. You can try as often as you like.',
  scoresSoFar: 'Your scores so far',
}

/** The shape of `en` with the wording left open: every key, any text. */
type Wording<T> = T extends (...args: infer Args) => string
  ? (...args: Args) => string
  : T extends string
    ? string
    : { [Key in keyof T]: Wording<T[Key]> }

/** What every language must provide. A key missing in one language is a type error. */
export type Strings = Wording<typeof en>

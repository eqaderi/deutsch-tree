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

  // Backup: progress exported to a file and imported from one.
  backupLink: 'Back up progress',
  backupTitle: 'Back up your progress',
  backupWhy:
    'Your progress is kept only in this browser, on this device. If the browser’s data is cleared, it is gone. A file keeps it safe, and takes it to another device.',
  /** A day as this language writes it. Use it for every date shown. */
  date: (date: Date) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(date),
  topicsDone: (count: number) => (count === 1 ? '1 topic done' : `${count} topics done`),
  onThisDevice: 'On this device',
  inTheFile: 'In the file',
  exportTitle: 'Export',
  exportText: 'Saves a file with your progress on this device. Nothing is uploaded.',
  exportProgress: 'Export progress',
  /** The name of the file follows on a line of its own. */
  exportedAs: 'Your progress is now in this file:',
  keepFileSafe: 'Keep the file somewhere safe.',
  importTitle: 'Import',
  importText:
    'Brings back the progress from a file that you exported here or on another device. It takes the place of the progress on this device.',
  importFile: 'Import a progress file',
  importReplaceTitle: 'Replace the progress on this device?',
  importReplaceText: 'The file takes the place of everything on this device. This cannot be undone.',
  exportedOn: (date: string) => `exported on ${date}`,
  replaceProgress: 'Replace progress',
  cancel: 'Cancel',
  imported: 'Progress imported.',
  importNotProgress: 'This is not a deutsch-tree progress file, or the file is damaged. Nothing was changed.',
  importNewerVersion:
    'This file was saved by a newer version of deutsch-tree than the one open here. Reload this page to get the newest version, then import the file again. Nothing was changed.',
  savedByNewerVersion:
    'The progress in this browser was saved by a newer version of deutsch-tree. Reload the page to get that version. Until then your progress is not shown, and nothing you do here is saved.',
  reload: 'Reload',
  // A milestone, said once on the tree, with the suggestion to back up.
  milestoneLevel: (level: string) => `You have done every ${level} topic there is so far.`,
  milestoneTopics: (count: number) => `You have done ${count} topics.`,
  suggestBackup: 'Your progress is kept only in this browser. A copy in a file keeps it safe.',
  notNow: 'Not now',

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

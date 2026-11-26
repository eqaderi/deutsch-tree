/**
 * Assistant grading: everything the app gives a learner to have a writing
 * task or a speaking part graded by an AI assistant outside the app.
 *
 *   taskSheet(task)                 the task as the learner reads it (German)
 *   assistantPrompt(task, language) the text to paste into an AI assistant
 *   scoreOutOf100(task, points)     the score rule that the prompt states
 *
 * Pure functions on an `ExamTask`: no interface, no storage, and no request
 * to anything. The app only copies the prompt; it never calls an AI service.
 * A node page and a mock exam can both use them.
 *
 * The score that comes back is typed in by the learner; what it does to the
 * progress is decided by the learning engine (`applyEnteredScore`).
 */
export { BANDS, type Criterion, type Marking, markingOf, wordsAskedFor } from './criteria.ts'
export { assistantPrompt } from './prompt.ts'
export { PRONUNCIATION_SHARE, scoreOutOf100 } from './score.ts'
export { sheetAsText, type TaskBlock, type TaskSheet, taskSheet } from './task-sheet.ts'

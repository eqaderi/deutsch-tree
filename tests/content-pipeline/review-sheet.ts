/** For tests of the blind review: a filled-in review sheet of the fixture's published node. */
import type { ReviewSheet } from '../../src/content-pipeline/review.ts'

/** What a careful reviewer answers to the fixture pool. Written out here, not read from the node file. */
export const RIGHT = {
  q1: 'wohne',
  q2: 'wohnst',
  q3: 'wohnt',
  q4: 'wohnen',
  q5: 'wohnt',
  q6: 'lerne',
  q7: 'lernst',
  q8: 'lernt',
  q9: 'spielen',
  q10: 'spielt',
  q11: 'koche',
  q12: 'kochst',
  // True/false: is the sentence correct German?
  q13: false,
  q14: true,
  q15: false,
  // Word ordering: every right order of the pieces.
  'order-1': [['wo', 'wohnst', 'du']],
  'order-2': [
    ['in Berlin', 'wohne', 'ich'],
    ['ich', 'wohne', 'in Berlin'],
  ],
  // Find the error: the wrong word.
  'error-1': 'wohnst',
  // Matching: every pair.
  'match-1': [
    ['wir', 'lernen'],
    ['ich', 'lerne'],
    ['du', 'lernst'],
  ],
}

/** The sheet as a reviewer hands it back. */
export function answered(sheet: ReviewSheet, answers: Record<string, unknown>, objections: Record<string, string> = {}) {
  return {
    ...sheet,
    questions: sheet.questions.map((entry) => ({
      ...entry,
      answer: answers[entry.id] ?? null,
      objection: objections[entry.id] ?? null,
    })),
  }
}

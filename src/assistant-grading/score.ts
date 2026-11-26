/**
 * The score out of 100 for one writing task or one speaking part, as the
 * prompt tells the assistant to work it out.
 *
 * The exam gives points per task and adds them up to a module score out of
 * 100. A node is one task, so its score is the task's points brought to the
 * same scale of 100, where the node's pass mark of 90 applies:
 *
 *   Schreiben: the share of the task's own points. Aufgabe 1 and 2 have 40
 *   points, Aufgabe 3 has 20, so 32.5 of 40 points is a score of 81.
 *
 *   Sprechen: the exam rates Aussprache once for all three parts, as 16 of
 *   the module's 100 points. A part on its own keeps that weight: the part's
 *   own criteria count for 84 points and Aussprache, rated on this part
 *   alone, for its official 16. So 21 of 28 points in Teil 1 (63 of 84) and
 *   12 for Aussprache is a score of 75. It is the score the whole module
 *   would get if every part went like this one.
 *
 * A half is rounded up, as the exam rounds a module result.
 */
import type { ExamTask } from '../content-model/index.ts'
import { markingOf } from './criteria.ts'

/** The points of the Sprechen module that are for Aussprache. */
export const PRONUNCIATION_SHARE = 16

export function scoreOutOf100(
  task: Pick<ExamTask, 'module' | 'part'>,
  points: { task: number; pronunciation?: number },
): number {
  const { maximum, pronunciation } = markingOf(task)
  if (!pronunciation) return Math.round((points.task * 100) / maximum)
  return Math.round((points.task * (100 - PRONUNCIATION_SHARE)) / maximum + (points.pronunciation ?? 0))
}

/**
 * The parts of a mock exam's Schreiben or Sprechen as points of their weight
 * in the module, from the score out of 100 that the learner typed in for
 * each task (`undefined` for none, which counts as 0). The points of all
 * parts add up to the module's score out of 100.
 *
 * A part weighs its share of the points of the module's parts: Schreiben
 * 40, 40 and 20. In Sprechen the parts have 28, 40 and 16 points and
 * Aussprache, rated once for all three, the other 16; a part's score already
 * holds its own Aussprache, so a part weighs its points and its share of
 * Aussprache, 28 of 84 of the 100. The module score is the weighted mean of
 * the parts: the points of the three parts plus Aussprache averaged over them
 * as the parts weigh.
 *
 * Progress keeps whole points, so each weight is shown whole (33, 48, 19)
 * and each part's points are its exact share rounded so that together they
 * make the module score, rounded as the exam rounds it (a half up): what
 * rounding leaves over goes to the parts with the largest fractions.
 */
export function modulePoints(
  module: ExamTask['module'],
  scores: ReadonlyArray<number | undefined>,
): Array<{ part: number; correct: number; total: number }> {
  const parts = ([1, 2, 3] as const).map((part) => {
    const { maximum } = markingOf({ module, part })
    return { part, maximum, reached: (scores[part - 1] ?? 0) * maximum }
  })
  // Everything is a whole number over `whole`, the points of the three parts.
  const whole = parts.reduce((sum, part) => sum + part.maximum, 0)
  const reached = parts.reduce((sum, part) => sum + part.reached, 0)
  const score = Math.floor((2 * reached + whole) / (2 * whole))

  const points = parts.map(({ part, maximum, reached }) => ({
    part,
    correct: Math.floor(reached / whole),
    total: Math.round((maximum * 100) / whole),
    fraction: reached % whole,
  }))
  let left = score - points.reduce((sum, part) => sum + part.correct, 0)
  for (const one of points.toSorted((a, b) => b.fraction - a.fraction)) {
    if (left === 0) break
    if (one.fraction === 0 || one.correct >= one.total) continue
    one.correct += 1
    left -= 1
  }
  return points.map(({ part, correct, total }) => ({ part, correct, total }))
}

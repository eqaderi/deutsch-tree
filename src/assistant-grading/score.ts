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

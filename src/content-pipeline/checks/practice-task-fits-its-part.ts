import {
  EXAM_MODULE_FACTS,
  type ExamPart,
  type ExamTaskFile,
  type ExamTaskFormat,
  examTaskFormat,
} from '../../content-model/index.ts'
import { type ContentCheck, problemIn } from './check.ts'

/**
 * Every practice task of a published exam-part node has the format of the
 * node's exam part: its number of texts and its number of items.
 *
 * This is what the pool minimum is for other nodes. An exam part is not asked
 * as a random draw of questions but as one whole task, so its size is the
 * size the exam gives it (six items in Lesen, Teil 1) and never 15. A draft
 * may still be growing.
 */
export const practiceTaskFitsItsPart: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    const { module, part, practice, status } = checked.node
    if (status !== 'published' || module === undefined || part === undefined) return []
    const format = examTaskFormat({ module, part })
    if (!format) return []
    return (practice ?? []).flatMap((task, index) =>
      examTaskProblems(task, { module, part }, format).map(({ where, message }) =>
        problemIn(checked, { where: `practice[${index}].${where}`, message }),
      ),
    )
  })

/**
 * What keeps one task from being a task of `part`, with the place inside the
 * task. Empty when it fits. A mock exam holds its parts to the same formats.
 */
export function examTaskProblems(
  task: ExamTaskFile,
  part: ExamPart,
  format: ExamTaskFormat,
): Array<{ where: 'texts' | 'items'; message: string }> {
  const name = `${EXAM_MODULE_FACTS[part.module].name}, Teil ${part.part}`
  const count = (number: number, one: string) => `${number} ${one}${number === 1 ? '' : 's'}`
  return (['texts', 'items'] as const)
    .filter((where) => task[where].length !== format[where])
    .map((where) => ({
      where,
      message: `not the format of ${name}: its task has ${count(format[where], where.slice(0, -1))}, task "${task.id}" has ${task[where].length}`,
    }))
}

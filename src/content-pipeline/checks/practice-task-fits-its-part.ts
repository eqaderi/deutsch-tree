import {
  EXAM_MODULE_FACTS,
  type ExamPart,
  type ItemTaskFile,
  type ItemTaskFormat,
  itemTaskFormat,
} from '../../content-model/index.ts'
import { type ContentCheck, problemIn } from './check.ts'

/**
 * Every practice task of a published exam-part node has the format of the
 * node's exam part: its number of texts and its number of items, texts that
 * are read (Lesen) or heard (Hören), and in a heard text the number of
 * people who speak.
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
    const format = itemTaskFormat({ module, part })
    if (!format) return []
    return (practice ?? []).flatMap((task, index) =>
      itemTaskProblems(task, { module, part }, format).map(({ where, message }) =>
        problemIn(checked, { where: `practice[${index}].${where}`, message }),
      ),
    )
  })

/**
 * What keeps one task from being a task of `part`, with the place inside the
 * task ("items", "texts[0]"). Empty when it fits. A mock exam holds its parts
 * to the same formats.
 */
export function itemTaskProblems(
  task: ItemTaskFile,
  part: ExamPart,
  format: ItemTaskFormat,
): Array<{ where: string; message: string }> {
  const name = `not the format of ${EXAM_MODULE_FACTS[part.module].name}, Teil ${part.part}`
  const count = (number: number, one: string) => `${number} ${one}${number === 1 ? '' : 's'}`
  const sizes = (['texts', 'items'] as const)
    .filter((where) => task[where].length !== format[where])
    .map((where) => ({
      where,
      message: `${name}: its task has ${count(format[where], where.slice(0, -1))}, task "${task.id}" has ${task[where].length}`,
    }))
  const texts = task.texts.flatMap((text, index) => {
    const named = `text "${text.id}" of task "${task.id}"`
    const heard = text.lines !== undefined
    if (heard !== (format.textsAre === 'heard')) {
      const how = format.textsAre === 'heard' ? 'heard (speakers and lines)' : 'read (a body)'
      return [
        { where: `texts[${index}]`, message: `${name}: its texts are ${how}, ${named} is ${heard ? 'heard' : 'read'}` },
      ]
    }
    const speakers = text.speakers?.length ?? 0
    if (heard && format.speakers !== undefined && speakers !== format.speakers) {
      return [
        {
          where: `texts[${index}].speakers`,
          message: `${name}: each of its texts has ${count(format.speakers, 'speaker')}, ${named} has ${speakers}`,
        },
      ]
    }
    return []
  })
  return [...sizes, ...texts]
}

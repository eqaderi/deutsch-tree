import type { NodeFile } from '../../content-model/index.ts'
import { CHAPTERS_FILE, type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/**
 * In Persian text, every piece of German stands in asterisks.
 *
 * A Persian page runs right to left. German that is not marked is laid out
 * with the Persian around it, and its hyphens and brackets land on the wrong
 * side: "-st" is shown as "st-". Marked German is shown left to right.
 *
 * The rule takes every Latin letter for German, because Persian is written
 * without any. A level ("B1") or a name in Latin letters goes in asterisks
 * too. It covers the texts in which asterisks mark German: titles, chapter
 * names, explanations, and the one-line reasons of mistakes, questions and
 * the items of practice tasks.
 */
export const germanInPersianIsMarked: ContentCheck = ({ nodes, chapters }) => {
  const problems: ContentProblem[] = []

  for (const checked of nodes) {
    for (const { where, text, question } of persianTextsOf(checked.node)) {
      const message = unmarkedGerman(text)
      if (message) problems.push(problemIn(checked, { ...(question ? { question } : {}), where, message }))
    }
  }

  ;(chapters ?? []).forEach((chapter, index) => {
    const message = unmarkedGerman(chapter.title.fa)
    if (message) problems.push({ file: CHAPTERS_FILE, where: `[${index}].title.fa`, message })
  })

  return problems
}

function persianTextsOf(node: NodeFile): Array<{ where: string; text: string; question?: string }> {
  return [
    { where: 'title.fa', text: node.title.fa },
    ...Object.entries(node.explanations?.fa ?? {}).flatMap(([name, value]) =>
      typeof value === 'string'
        ? [{ where: `explanations.fa.${name}`, text: value }]
        : value.map((step, index) => ({ where: `explanations.fa.${name}[${index}]`, text: step })),
    ),
    ...(node.mistakes ?? []).map((mistake, index) => ({ where: `mistakes[${index}].why.fa`, text: mistake.why.fa })),
    ...(node.questions ?? []).map((question, index) => ({
      where: `questions[${index}].explanation.fa`,
      text: question.explanation.fa,
      question: question.id,
    })),
    ...(node.practice ?? []).flatMap((task, taskIndex) =>
      task.items.map((item, index) => ({
        where: `practice[${taskIndex}].items[${index}].explanation.fa`,
        text: item.explanation.fa,
        question: `${task.id}/${item.id}`,
      })),
    ),
  ]
}

/** The first run of Latin letters outside asterisks, with the hyphens and dots that belong to it. */
const LATIN_RUN = /[-.’'(]*\p{Script=Latin}[\p{Script=Latin}\p{Mark}\-.’'()]*/u

/** What is wrong with the text, or nothing. */
function unmarkedGerman(text: string): string | undefined {
  const outsideAsterisks = text.replace(/\*[^*]+\*/g, ' ')
  const german = LATIN_RUN.exec(outsideAsterisks)?.[0]
  if (german === undefined) return undefined
  return `German outside asterisks: "${german}". A Persian page shows it in the wrong order; write *${german}*`
}

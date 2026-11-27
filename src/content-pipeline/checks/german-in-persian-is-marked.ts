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
 * names, purposes, explanations, the meanings of phrases, captions of
 * diagrams, and the one-line reasons of mistakes, questions and the items
 * of practice tasks. A diagram's labels hold no German at all; the schema
 * says so.
 *
 * The meaning of a vocabulary word is plain text: it is shown as written,
 * asterisks and all, and it is the prompt when the word is asked. So it may
 * hold no Latin letter at all, marked or not.
 */
export const germanInPersianIsMarked: ContentCheck = ({ nodes, chapters }) => {
  const problems: ContentProblem[] = []

  for (const checked of nodes) {
    for (const { where, text, question } of persianTextsOf(checked.node)) {
      const message = unmarkedGerman(text)
      if (message) problems.push(problemIn(checked, { ...(question ? { question } : {}), where, message }))
    }
  }

  for (const checked of nodes) {
    ;(checked.node.words ?? []).forEach((word, index) => {
      const german = word.meaning === undefined ? undefined : /\p{Script=Latin}+/u.exec(word.meaning.fa)?.[0]
      if (german === undefined) return
      problems.push(
        problemIn(checked, {
          where: `words[${index}].meaning.fa`,
          message: `Latin letters in a meaning: "${german}". A meaning is plain text, shown as it is written, so German in it reads in the wrong order on a Persian page; write the meaning in Persian only`,
        }),
      )
    })
  }

  ;(chapters ?? []).forEach((chapter, index) => {
    const message = unmarkedGerman(chapter.title.fa)
    if (message) problems.push({ file: CHAPTERS_FILE, where: `[${index}].title.fa`, message })
  })

  return problems
}

export function persianTextsOf(node: NodeFile): Array<{ where: string; text: string; question?: string }> {
  return [
    { where: 'title.fa', text: node.title.fa },
    ...(node.purpose ? [{ where: 'purpose.fa', text: node.purpose.fa }] : []),
    ...Object.entries(node.explanations?.fa ?? {}).flatMap(([name, value]) =>
      typeof value === 'string'
        ? [{ where: `explanations.fa.${name}`, text: value }]
        : value.map((step, index) => ({ where: `explanations.fa.${name}[${index}]`, text: step })),
    ),
    ...(node.diagrams ?? []).map((diagram, index) => ({
      where: `diagrams[${index}].caption.fa`,
      text: diagram.caption.fa,
    })),
    ...(node.mistakes ?? []).map((mistake, index) => ({ where: `mistakes[${index}].why.fa`, text: mistake.why.fa })),
    ...(node.phrases ?? []).map((phrase, index) => ({
      where: `phrases[${index}].meaning.fa`,
      text: phrase.meaning.fa,
    })),
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

/** What is wrong with the Persian text, or nothing. */
export function unmarkedGerman(text: string): string | undefined {
  const outsideAsterisks = text.replace(/\*[^*]+\*/g, ' ')
  const german = LATIN_RUN.exec(outsideAsterisks)?.[0]
  if (german === undefined) return undefined
  return `German outside asterisks: "${german}". A Persian page shows it in the wrong order; write *${german}*`
}

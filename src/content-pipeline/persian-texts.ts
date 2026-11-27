/**
 * The Persian texts of the content and the rules of content/persian-style.md
 * that a program can see in them.
 *
 * `persianProblem(text)` is every such rule for one Persian text in which
 * asterisks mark German: German stands in asterisks (`unmarkedGerman`), and
 * the spelling (`misspeltPersian`). A file that is not a node (a mock exam,
 * the official mock exams) asks it of each of its Persian texts, and the
 * interface strings are held to it in tests/language/strings.test.ts. The
 * texts of nodes are held to the same rules by one check each,
 * `german-in-persian-is-marked.ts` and `persian-is-spelt-to-the-style-guide.ts`,
 * over `persianTextsOf`: a new rule goes into `persianProblem` and gets its
 * own check.
 */
import type { NodeFile } from '../content-model/index.ts'
import { misspeltPersian } from '../language/persian-spelling.ts'

/** One Persian text and its place: the field ("title.fa"), and the question or item it belongs to. */
export interface PersianText {
  where: string
  text: string
  question?: string
}

/** What breaks the rules for Persian text in the text, or nothing. Only the first problem is named. */
export function persianProblem(text: string): string | undefined {
  return unmarkedGerman(text) ?? misspeltPersian(text)
}

/**
 * Every Persian text of a node in which asterisks mark German: titles,
 * purposes, explanations, captions of diagrams, the meanings of phrases,
 * and the one-line reasons of mistakes, questions and practice items. The
 * meaning of a vocabulary word is not among them: it is plain text.
 */
export function persianTextsOf(node: NodeFile): PersianText[] {
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

/** The German in a Persian text that stands outside asterisks, as a problem, or nothing. */
export function unmarkedGerman(text: string): string | undefined {
  const outsideAsterisks = text.replace(/\*[^*]+\*/g, ' ')
  const german = LATIN_RUN.exec(outsideAsterisks)?.[0]
  if (german === undefined) return undefined
  return `German outside asterisks: "${german}". A Persian page shows it in the wrong order; write *${german}*`
}

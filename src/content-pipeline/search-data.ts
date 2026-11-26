/**
 * Builds the search data: for each language, the text of every published
 * node as a list of passages. Titles are not repeated here; the index has
 * them, also for the nodes that are not written yet.
 *
 * Left out on purpose: the questions (a search must not show a test's
 * answers), the practice tasks of an exam part (their texts are for the
 * attempt, and their items are questions) and the wrong half of a common
 * mistake (a result must never show wrong German as if it were an example).
 *
 * A new kind of node adds its own passages in `passagesOf`; the shape of the
 * data and the app's search stay as they are. A phrases node gives what its
 * phrases are for, and each phrase with its meaning and its example.
 */
import {
  type CompiledNode,
  type Example,
  type ExamTask,
  LANGUAGES,
  type Language,
  type Localised,
  type RichText,
  type SearchData,
} from '../content-model/index.ts'
import { hasPool } from '../content-model/scoring.ts'

/** Stands between a piece of German and what the learner's language says about it. */
const THEN = ' – '

/** Stands between the cells of a table row. */
const CELL = ' · '

export function searchData(nodes: CompiledNode[]): Localised<SearchData> {
  return Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      {
        entries: nodes
          .map((node) => ({ node: node.id, passages: passagesOf(node, language) }))
          .filter((entry) => entry.passages.length > 0),
      },
    ]),
  ) as Localised<SearchData>
}

function passagesOf(node: CompiledNode, language: Language): RichText[] {
  const { content } = node
  if (!content) return []
  if (!hasPool(content)) {
    // An exam part: what its page explains (what the part asks, how it is scored, each step of
    // the approach), and for a writing or speaking part the words of its task. Never a practice
    // task: its text is for the attempt, and its items are questions.
    const { task, scoring, approach } = content.explanations[language]
    return [task, scoring, ...approach, ...('task' in content ? taskPassages(content.task) : [])]
  }
  if ('phrases' in content) {
    return [
      ...(node.purpose ? [node.purpose[language]] : []),
      ...content.phrases.flatMap((phrase) => [
        joined([{ de: phrase.de }, THEN, ...phrase.meaning[language]]),
        exampleWithItsMeaning(phrase.example, language),
      ]),
    ]
  }
  return [
    content.explanations[language].rule,
    ...content.table.rows.map((row): RichText => [{ de: row.join(CELL) }]),
    ...content.examples.map((example) => exampleWithItsMeaning(example, language)),
    ...content.mistakes.map((mistake): RichText => joined([{ de: mistake.right }, THEN, ...mistake.why[language]])),
  ]
}

/** A German sentence, and what it means in the learner's language. A learner reading in German needs no translation. */
function exampleWithItsMeaning(example: Example, language: Language): RichText {
  return language === 'de' ? [{ de: example.de }] : [{ de: example.de }, THEN + example[language]]
}

/**
 * A writing or speaking node is found by the words of its task: the
 * situation or the topic, and each point. The task is German in every
 * language.
 */
function taskPassages(task: ExamTask): RichText[] {
  const texts = [
    'situation' in task ? task.situation : task.topic,
    ...('points' in task ? task.points : []),
    ...('opinion' in task ? [task.opinion.text] : []),
  ]
  return texts.map((text): RichText => [{ de: text }])
}

/** The same text with neighbouring plain parts made one. */
function joined(parts: RichText): RichText {
  const result: RichText = []
  for (const part of parts) {
    const last = result.at(-1)
    if (typeof part === 'string' && typeof last === 'string') result[result.length - 1] = last + part
    else result.push(part)
  }
  return result
}

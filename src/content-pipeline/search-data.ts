/**
 * Builds the search data: for each language, the text of every published
 * node as a list of passages. Titles are not repeated here; the index has
 * them, also for the nodes that are not written yet.
 *
 * Left out on purpose: the questions (a search must not show a test's
 * answers) and the wrong half of a common mistake (a result must never show
 * wrong German as if it were an example).
 *
 * A new kind of node adds its own passages in `passagesOf`; the shape of the
 * data and the app's search stay as they are.
 */
import {
  type CompiledNode,
  type Language,
  LANGUAGES,
  type Localised,
  type RichText,
  type SearchData,
} from '../content-model/index.ts'

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
  return [
    content.explanations[language].rule,
    ...content.table.rows.map((row): RichText => [{ de: row.join(CELL) }]),
    ...content.examples.map(
      // A learner reading in German needs no translation.
      (example): RichText => (language === 'de' ? [{ de: example.de }] : [{ de: example.de }, THEN + example[language]]),
    ),
    ...content.mistakes.map((mistake): RichText => joined([{ de: mistake.right }, THEN, ...mistake.why[language]])),
  ]
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

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseScopeList, SCOPE_LIST_FILE } from '../../content-model/scope-list.ts'
import { type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/**
 * The vocabulary nodes together hold every word of the scope list, each
 * exactly once, and no other word.
 *
 * So no word in scope is silently left out, none is taught twice, and a word
 * can only be added to the vocabulary by adding it to the scope list.
 * Content without vocabulary nodes needs no scope list.
 */
export const vocabularyCoversTheScopeList: ContentCheck = async ({ contentDir, nodes }) => {
  const vocabulary = nodes.filter(({ node }) => node.kind === 'vocabulary')

  let text: string
  try {
    text = await readFile(path.join(contentDir, SCOPE_LIST_FILE), 'utf8')
  } catch {
    if (vocabulary.length === 0) return []
    return [
      {
        file: SCOPE_LIST_FILE,
        message: 'is missing: the list of the words in scope, which the vocabulary nodes must cover',
      },
    ]
  }

  const scope = parseScopeList(text)
  const problems: ContentProblem[] = scope.problems.map(({ line, message }) => ({
    file: SCOPE_LIST_FILE,
    where: `line ${line}`,
    message,
  }))
  const inScope = new Set(scope.words.map(({ word }) => word))

  /** The node that holds each word, by the first file that names it. */
  const holder = new Map<string, string>()
  for (const checked of vocabulary) {
    for (const [index, { word }] of (checked.node.words ?? []).entries()) {
      const where = `words[${index}].word`
      const first = holder.get(word)
      if (first !== undefined) {
        const place = first === checked.node.id ? 'twice in this node' : `also a word of node ${first}`
        problems.push(
          problemIn(checked, { where, message: `"${word}" is ${place}; every word belongs to exactly one node` }),
        )
        continue
      }
      holder.set(word, checked.node.id)
      if (!inScope.has(word)) {
        problems.push(
          problemIn(checked, {
            where,
            message: `"${word}" is not a word of the scope list (${SCOPE_LIST_FILE}); check its spelling there`,
          }),
        )
      }
    }
  }

  for (const { word, level, line } of scope.words) {
    if (holder.has(word)) continue
    problems.push({
      file: SCOPE_LIST_FILE,
      where: `line ${line}`,
      message: `the word "${word}" (${level}) is in no vocabulary node; every word of the scope list belongs to exactly one node`,
    })
  }

  return problems
}

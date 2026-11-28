import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NO_ARTICLE } from '../../content-model/index.ts'
import { parseScopeList, SCOPE_LIST_FILE, type ScopeWord } from '../../content-model/scope-list.ts'
import { type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/**
 * What a vocabulary node says about a word's grammar agrees with the scope
 * list: its word class, level and article, and its plural.
 *
 * The node file writes them out because its page, its test and an Anki
 * export read them from there, and because the lists print a plural only as
 * a marker ("¨-e"), never as the word ("Stühle"). This check keeps the two
 * from drifting apart. A noun that takes no article ("Deutschland") is `none`
 * in both. A word that the scope list does not have is reported
 * by `vocabulary-covers-the-scope-list`; an empty column is not compared.
 */
export const vocabularyAgreesWithTheScopeList: ContentCheck = async ({ contentDir, nodes }) => {
  const vocabulary = nodes.filter(({ node }) => node.kind === 'vocabulary')
  if (vocabulary.length === 0) return []
  const text = await readFile(path.join(contentDir, SCOPE_LIST_FILE), 'utf8').catch(() => '')
  const scope = new Map(parseScopeList(text).words.map((word) => [word.word, word]))

  const problems: ContentProblem[] = []
  for (const checked of vocabulary) {
    for (const [index, entry] of (checked.node.words ?? []).entries()) {
      const listed = scope.get(entry.word)
      if (!listed) continue
      const problem = (field: string, message: string) =>
        problems.push(problemIn(checked, { where: `words[${index}].${field}`, message }))
      const differs = (field: 'class' | 'level', given: string | undefined) => {
        if (given !== undefined && given !== listed[field]) {
          problem(field, `is "${given}", but the scope list gives "${listed[field]}" for "${entry.word}"`)
        }
      }

      differs('class', entry.class)
      differs('level', entry.level)
      const articles = listed.article.split('/').filter(Boolean)
      if (entry.article !== undefined && articles.length > 0 && !articles.includes(entry.article)) {
        const gives =
          listed.article === NO_ARTICLE
            ? `no article for "${entry.word}"; write "article: ${NO_ARTICLE}"`
            : `"${listed.article}" for "${entry.word}"`
        problem('article', `is "${entry.article}", but the scope list gives ${gives}`)
      }
      const plural = pluralProblem(entry, listed)
      if (plural) problem('plural', plural)
    }
  }
  return problems
}

/** What is wrong with the plural of an entry, measured by the scope list, or nothing. */
function pluralProblem(
  entry: { word: string; plural?: string | undefined; number?: string | undefined },
  listed: ScopeWord,
): string | undefined {
  const marker = listed.plural.trim()
  if (marker === '' || (entry.plural === undefined && entry.number === undefined)) return undefined
  if (marker === 'pl' || marker === 'sg') {
    const number = marker === 'pl' ? 'plural-only' : 'singular-only'
    if (entry.number === number) return undefined
    return `the scope list marks "${entry.word}" as ${marker === 'pl' ? 'plural' : 'singular'} only; write "number: ${number}"`
  }
  const forms = marker.split(/\s*[/;]\s*/).map((one) => pluralOf(entry.word, one))
  if (entry.plural !== undefined && forms.includes(entry.plural)) return undefined
  const given = entry.plural === undefined ? `"number: ${entry.number}"` : `"${entry.plural}"`
  return `is ${given}, but the scope list marks "${marker}" for "${entry.word}": "${forms.join('" or "')}"`
}

/**
 * The plural that a marker of the lists stands for: "-e" adds an ending,
 * "¨-e" also puts an umlaut on the last a, o, u or au of the word, "-" adds
 * nothing, and a whole word ("Museen") is the plural itself.
 */
export function pluralOf(word: string, marker: string): string {
  if (!/^[-¨]/.test(marker)) return marker
  const umlaut = marker.startsWith('¨')
  const ending = marker.replace(/^¨?-/, '')
  return (umlaut ? withUmlaut(word) : word) + ending
}

function withUmlaut(word: string): string {
  const UMLAUT: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' }
  // "au" takes the umlaut on its a: Haus, Häuser.
  const match = /(?:([aA])u|([aouAOU]))(?=[^aouAOUäöü]*$)/.exec(word)
  if (!match) return word
  const at = match.index
  const letter = word.charAt(at)
  return `${word.slice(0, at)}${UMLAUT[letter] ?? letter}${word.slice(at + 1)}`
}

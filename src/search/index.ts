/**
 * Search: finds nodes by the words of their titles and of their content.
 *
 * Pure functions with no interface and no loading. The app gives it the
 * node summaries of the index and the search data of the learner's language
 * (`search/<language>.json`, written by the content pipeline).
 */
import type { Language, NodeSummary, RichText, SearchData } from '../content-model/index.ts'
import { textOf } from '../content-model/rich-text.ts'

export interface SearchResult {
  node: NodeSummary
  /**
   * The piece of the node that the words were found in, to show under its
   * title. Null when the title that the learner sees holds every word.
   */
  passage: RichText | null
}

/** A text to look in: as it is shown, and as it is compared. */
interface Searchable {
  shown: RichText
  folded: string
}

/**
 * Gets everything ready once, and returns the function that answers one
 * query. A node is found when each word of the query stands somewhere in it:
 * in its title, in its German title, or in a passage of its content.
 *
 * Nodes found by a title come first, then nodes found by their content; each
 * group is in the order of `nodes`, which is the curriculum order.
 */
export function prepareSearch(
  nodes: NodeSummary[],
  data: SearchData,
  language: Language,
): (query: string) => SearchResult[] {
  const passagesOf = new Map(data.entries.map((entry) => [entry.node, entry.passages]))
  const searchable = nodes.map((node) => {
    // The German title is a passage like any other: a learner who reads in
    // another language may still type "Akkusativ".
    const germanTitle: RichText[] = language === 'de' ? [] : [[{ de: textOf(node.title.de) }]]
    return {
      node,
      title: fold(textOf(node.title[language])),
      passages: [...germanTitle, ...(passagesOf.get(node.id) ?? [])].map(
        (shown): Searchable => ({ shown, folded: fold(textOf(shown)) }),
      ),
    }
  })

  return (query) => {
    const words = fold(query).split(' ').filter(Boolean).map(spellings)
    if (words.length === 0) return []

    const byTitle: SearchResult[] = []
    const byContent: SearchResult[] = []
    for (const { node, title, passages } of searchable) {
      if (words.every((word) => holds(title, word))) {
        byTitle.push({ node, passage: null })
        continue
      }
      const everywhere = [title, ...passages.map((passage) => passage.folded)]
      if (!words.every((word) => everywhere.some((text) => holds(text, word)))) continue
      const result = { node, passage: bestPassage(passages, words) }
      // The German title is the first passage of a node.
      if (language !== 'de' && result.passage === passages[0]?.shown) byTitle.push(result)
      else byContent.push(result)
    }
    return [...byTitle, ...byContent]
  }
}

/** The passage that holds the most words of the query; the earlier one when two hold as many. */
function bestPassage(passages: Searchable[], words: Word[]): RichText | null {
  let best: Searchable | null = null
  let bestCount = 0
  for (const passage of passages) {
    const count = words.filter((word) => holds(passage.folded, word)).length
    if (count > bestCount) {
      best = passage
      bestCount = count
    }
  }
  return best?.shown ?? null
}

/**
 * A text as search compares it: the query and the content both go through
 * here, so what the learner types meets what the content says.
 *
 *   - Capitals do not count.
 *   - ä, ö, ü become a, o, u and ß becomes ss, so "mude" and "strasse" find
 *     "müde" and "Straße". Other marks on a letter go the same way.
 *   - Persian letters have one form each, whichever keyboard wrote them:
 *     the Arabic ي and ك count as ی and ک. The signs on a letter are dropped
 *     too, so «آب» is found as «اب» and «کلمهٔ» as «کلمه».
 *   - The zero-width non-joiner is dropped. Together with "a word is found
 *     anywhere in a text" this finds «می‌کنم» typed with the non-joiner,
 *     as «می کنم» and as «میکنم».
 *   - Everything that is not a letter or a number separates words.
 */
export function fold(text: string): string {
  return (
    text
      // Splits a letter from the marks on it (ä into a and two dots), then drops the marks.
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .replace(ARABIC_FORMS, (letter) => PERSIAN_FORM[letter] ?? letter)
      .replace(INVISIBLE, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  )
}

/**
 * Letters of an Arabic keyboard and the Persian letter each stands for: the
 * two Arabic forms of ی, the Arabic ك, and the two other ways to write a
 * final ه (ة, and the ە that is left of ۀ once its sign is dropped).
 */
const PERSIAN_FORM: Record<string, string> = {
  '\u064A': '\u06CC',
  '\u0649': '\u06CC',
  '\u0643': '\u06A9',
  '\u0629': '\u0647',
  '\u06D5': '\u0647',
}
const ARABIC_FORMS = /[\u064A\u0649\u0643\u0629\u06D5]/g

/**
 * Characters that are typed but not seen: the zero-width non-joiner and
 * joiner, direction marks, the soft hyphen. And the line that stretches a
 * Persian word (ـ).
 */
const INVISIBLE = /[\p{Cf}\u0640]/gu

/** One word of a query, in each spelling it may have in the folded content. */
type Word = string[]

/**
 * A learner without umlauts on the keyboard writes "muede" for "müde", which
 * is "mude" once folded. So a word of the query is also tried with ae, oe and
 * ue as a, o and u. The word as typed stays, for "Goethe" and "neue".
 */
function spellings(word: string): Word {
  const withoutE = word.replace(/([aou])e/g, '$1')
  return withoutE === word ? [word] : [word, withoutE]
}

function holds(text: string, word: Word): boolean {
  return word.some((spelling) => text.includes(spelling))
}

/** Rich text as one plain string. */

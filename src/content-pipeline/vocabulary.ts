/**
 * Vocabulary nodes in the pipeline: from the words of a node file to the
 * words and the pool of the compiled node.
 */
import { spoken } from '../audio/index.ts'
import {
  asLearned,
  NO_ARTICLE,
  type NodeFile,
  type Question,
  type VocabularyContent,
  type VocabularyWord,
} from '../content-model/index.ts'
import { vocabularyPool } from '../learning-engine/index.ts'

type EntryFile = NonNullable<NodeFile['words']>[number]

/** Whether an entry has every part that a page and a test need. The schema demands it of a published node. */
function isWritten(entry: EntryFile): boolean {
  const hasNounParts = entry.article !== undefined && (entry.plural !== undefined || entry.number !== undefined)
  return (
    entry.class !== undefined &&
    entry.level !== undefined &&
    entry.meaning !== undefined &&
    entry.definition !== undefined &&
    entry.example !== undefined &&
    (entry.class !== 'noun' || hasNounParts)
  )
}

/**
 * The words of a vocabulary node, when every one of them is written.
 * Undefined for a node of another kind and for a draft that still has a bare
 * word: neither has a pool yet.
 */
export function writtenWords(node: Partial<Pick<NodeFile, 'kind' | 'words'>>): VocabularyWord[] | undefined {
  const words = node.kind === 'vocabulary' ? (node.words ?? []) : []
  return words.length > 0 && words.every(isWritten) ? words.map(asWord) : undefined
}

/**
 * A written entry as a page and a test read it. A noun that takes no article
 * (`article: none`) has none, so it is shown, heard and asked bare.
 */
function asWord(entry: EntryFile): VocabularyWord {
  const { article, ...word } = entry as EntryFile & Omit<VocabularyWord, 'article'>
  return article === NO_ARTICLE || article === undefined ? word : { ...word, article }
}

/**
 * The pool of a vocabulary node, made from its words by the learning engine.
 * Empty while a word is not written. It is made here and in no other place,
 * so the pool that is reviewed is the pool that is compiled and asked.
 */
export function vocabularyQuestions(node: Partial<Pick<NodeFile, 'kind' | 'words'>>): Question[] {
  const words = writtenWords(node)
  return words ? vocabularyPool(words) : []
}

/** How many questions each word of a vocabulary node gives: one from German, one into German. */
export const QUESTIONS_PER_WORD = 2

export function compileVocabularyContent(node: NodeFile): VocabularyContent {
  // The schema guarantees that every word of a published node is written.
  const words = writtenWords(node) ?? []
  return {
    // The word is heard as it is learned, a noun with its article.
    words: words.map((word) => ({
      ...word,
      audio: spoken(asLearned(word)),
      example: { ...word.example, audio: spoken(word.example.de) },
    })),
    questions: vocabularyPool(words),
    attemptSize: node.attemptSize,
  }
}

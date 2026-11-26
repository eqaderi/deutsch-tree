import type { VocabularyWord } from '../../src/content-model/index.ts'

/** A word of a vocabulary node, with invented meanings where a test does not care. */
export function word(fields: Pick<VocabularyWord, 'word' | 'class'> & Partial<VocabularyWord>): VocabularyWord {
  return {
    level: 'A1',
    meaning: { en: `meaning of ${fields.word}`, fa: `معنی ${fields.word}` },
    definition: `Definition von ${fields.word}`,
    example: { de: `Satz mit ${fields.word}.`, en: `Sentence with ${fields.word}.`, fa: `جمله با ${fields.word}.` },
    alsoAccepted: [],
    tooCloseTo: [],
    ...fields,
  }
}

export const TISCH = word({
  word: 'Tisch',
  class: 'noun',
  article: 'der',
  plural: 'Tische',
  meaning: { en: 'table', fa: 'میز' },
  definition: 'ein Möbelstück mit einer Platte und vier Beinen',
  example: { de: 'Das Essen steht auf dem Tisch.', en: 'The food is on the table.', fa: 'غذا روی میز است.' },
})

export const TUER = word({ word: 'Tür', class: 'noun', article: 'die', plural: 'Türen' })
export const BETT = word({ word: 'Bett', class: 'noun', article: 'das', plural: 'Betten' })
export const LAMPE = word({ word: 'Lampe', class: 'noun', article: 'die', plural: 'Lampen' })
export const STUHL = word({ word: 'Stuhl', class: 'noun', article: 'der', plural: 'Stühle' })
export const MOEBEL = word({ word: 'Möbel', class: 'noun', article: 'die', number: 'plural-only' })
export const WOHNEN = word({ word: 'wohnen', class: 'verb' })
export const KOCHEN = word({ word: 'kochen', class: 'verb' })
export const GROSS = word({ word: 'groß', class: 'adjective' })

/** Five nouns, a noun that has only a plural, two verbs and an adjective. */
export const HOME = [TISCH, TUER, BETT, LAMPE, STUHL, MOEBEL, WOHNEN, KOCHEN, GROSS]

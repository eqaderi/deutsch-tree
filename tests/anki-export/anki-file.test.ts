import { expect, test } from 'vitest'
import { ankiFileName, ankiText } from '../../src/anki-export/index.ts'
import { word } from '../learning-engine/words.ts'

/** A noun with an umlaut, a verb whose fields hold a quote, a tab, an ampersand and an angle bracket. */
const MAEDCHEN = word({
  word: 'Mädchen',
  class: 'noun',
  article: 'das',
  plural: 'Mädchen',
  meaning: { en: 'girl', fa: 'دختر' },
  definition: 'ein junges Kind, weiblich',
  example: { de: 'Das Mädchen spielt im Garten.', en: 'The girl plays in the garden.', fa: 'دختر در باغ بازی می‌کند.' },
})
const GRUESSEN = word({
  word: 'grüßen',
  class: 'verb',
  meaning: { en: 'to say "hello"\tto greet', fa: '«سلام» گفتن' },
  definition: 'jemandem „Hallo“ sagen',
  example: {
    de: 'Er sagt: "Hallo & guten Tag!"',
    en: 'He says: "Hello & good day!" <smiles>',
    fa: 'او می‌گوید: «سلام و روز بخیر!»',
  },
})
const WORDS = [MAEDCHEN, GRUESSEN]

/** The headers that every file begins with: Anki 2.1.54 and newer read them. */
const HEADERS = [
  '#separator:tab',
  '#html:true',
  '#notetype:Basic',
  '#deck column:3',
  '#guid column:4',
  '#tags:deutsch-tree',
].join('\n')

test('in English a card has the word with its article in front, and the meaning and the example on the back', () => {
  expect(ankiText(WORDS, 'en')).toBe(
    `${HEADERS}
das Mädchen\tgirl<br><br>Das Mädchen spielt im Garten.<br>The girl plays in the garden.\tdeutsch-tree\tdeutsch-tree:Mädchen
grüßen\t"to say ""hello""\tto greet<br><br>Er sagt: ""Hallo &amp; guten Tag!""<br>He says: ""Hello &amp; good day!"" &lt;smiles&gt;"\tdeutsch-tree\tdeutsch-tree:grüßen
`,
  )
})

test('in Persian the meaning and the translation are marked right to left; the German stays as it is', () => {
  expect(ankiText(WORDS, 'fa')).toBe(
    `${HEADERS}
das Mädchen\t"<span dir=""rtl"">دختر</span><br><br>Das Mädchen spielt im Garten.<br><span dir=""rtl"">دختر در باغ بازی می‌کند.</span>"\tdeutsch-tree\tdeutsch-tree:Mädchen
grüßen\t"<span dir=""rtl"">«سلام» گفتن</span><br><br>Er sagt: ""Hallo &amp; guten Tag!""<br><span dir=""rtl"">او می‌گوید: «سلام و روز بخیر!»</span>"\tdeutsch-tree\tdeutsch-tree:grüßen
`,
  )
})

test('in simple German the back has the German definition and the example, with no translation', () => {
  expect(ankiText(WORDS, 'de')).toBe(
    `${HEADERS}
das Mädchen\tein junges Kind, weiblich<br><br>Das Mädchen spielt im Garten.\tdeutsch-tree\tdeutsch-tree:Mädchen
grüßen\t"jemandem „Hallo“ sagen<br><br>Er sagt: ""Hallo &amp; guten Tag!"""\tdeutsch-tree\tdeutsch-tree:grüßen
`,
  )
})

test('a noun that takes no article has the word alone in front; a name that takes one keeps it', () => {
  const deutschland = word({
    word: 'Deutschland',
    class: 'noun',
    number: 'singular-only',
    meaning: { en: 'Germany', fa: 'آلمان' },
    example: { de: 'Ich wohne in Deutschland.', en: 'I live in Germany.', fa: 'من در آلمان زندگی می‌کنم.' },
  })
  const schweiz = word({
    word: 'Schweiz',
    class: 'noun',
    article: 'die',
    number: 'singular-only',
    meaning: { en: 'Switzerland', fa: 'سوئیس' },
    example: { de: 'Die Schweiz ist schön.', en: 'Switzerland is beautiful.', fa: 'سوئیس زیباست.' },
  })

  expect(ankiText([deutschland, schweiz], 'en')).toBe(
    `${HEADERS}
Deutschland\tGermany<br><br>Ich wohne in Deutschland.<br>I live in Germany.\tdeutsch-tree\tdeutsch-tree:Deutschland
die Schweiz\tSwitzerland<br><br>Die Schweiz ist schön.<br>Switzerland is beautiful.\tdeutsch-tree\tdeutsch-tree:Schweiz
`,
  )
})

test('the file of one node is named after it; the file of every started node says so', () => {
  expect(ankiFileName('vocabulary-family')).toBe('deutsch-tree-anki-vocabulary-family.txt')
  expect(ankiFileName('started')).toBe('deutsch-tree-anki-started.txt')
})

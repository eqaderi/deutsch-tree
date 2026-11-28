import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, fixtureContentWith, VOCABULARY } from './fixture.ts'

/**
 * The fixture's scope list gives, for the words of the published vocabulary
 * node: Tisch der -e, Stuhl der ¨-e, Fenster das -, Möbel die pl (A2),
 * schlafen a verb, groß an adjective, Deutschland no article (`none`) sg.
 */
const SCOPE_LIST = 'vocabulary/scope-list.tsv'
const NODE = 'vocabulary-fixture-home'

async function errorsAfter(edits: Record<string, (text: string) => string>) {
  return (await compileContent(await fixtureContentWith(edits))).report.errors
}

const inWords = (where: string, message: string) => ({ file: VOCABULARY, node: NODE, where, message })

test('a word whose article, word class or level differs from the scope list is rejected', async () => {
  const errors = await errorsAfter({
    [VOCABULARY]: changeNode((node) => {
      node.words[0].article = 'das'
      node.words[9].class = 'adverb'
      node.words[7].level = 'A1'
    }),
  })

  expect(errors).toEqual(
    expect.arrayContaining([
      inWords('words[0].article', 'is "das", but the scope list gives "der" for "Tisch"'),
      inWords('words[7].level', 'is "A1", but the scope list gives "A2" for "Möbel"'),
      inWords('words[9].class', 'is "adverb", but the scope list gives "adjective" for "groß"'),
    ]),
  )
})

test('the plural must be the one the scope list marks, written out', async () => {
  const errors = await errorsAfter({
    [VOCABULARY]: changeNode((node) => {
      node.words[0].plural = 'Tischen'
      node.words[3].plural = 'Stuhle'
    }),
  })

  expect(errors).toEqual(
    expect.arrayContaining([
      inWords('words[0].plural', 'is "Tischen", but the scope list marks "-e" for "Tisch": "Tische"'),
      inWords('words[3].plural', 'is "Stuhle", but the scope list marks "¨-e" for "Stuhl": "Stühle"'),
    ]),
  )
})

test('a noun that the scope list marks as plural only, or as singular only, says so', async () => {
  const errors = await errorsAfter({
    [VOCABULARY]: changeNode((node) => {
      delete node.words[7].number
      node.words[7].plural = 'Möbel'
    }),
    [SCOPE_LIST]: (text) => text.replace('Fenster\tnoun\tA1\tdas\t-', 'Fenster\tnoun\tA1\tdas\tsg'),
  })

  expect(errors).toEqual(
    expect.arrayContaining([
      inWords('words[5].plural', 'the scope list marks "Fenster" as singular only; write "number: singular-only"'),
      inWords('words[7].plural', 'the scope list marks "Möbel" as plural only; write "number: plural-only"'),
    ]),
  )
})

test('the plural markers of the lists are written out as a German reader expects them', async () => {
  const words = [
    ['Haus', 'das', '¨-er', 'Häuser'],
    ['Mann', 'der', '¨-er', 'Männer'],
    ['Bruder', 'der', '¨-', 'Brüder'],
    ['Lehrer', 'der', '-', 'Lehrer'],
    ['Bus', 'der', '-se', 'Busse'],
    ['Museum', 'das', 'Museen', 'Museen'],
    ['Pizza', 'die', '-s/Pizzen', 'Pizzen'],
  ]
  const errors = await errorsAfter({
    [SCOPE_LIST]: (text) =>
      text + words.map(([word, article, marker]) => `${word}\tnoun\tA1\t${article}\t${marker}\n`).join(''),
    [VOCABULARY]: changeNode((node) => {
      for (const [word, article, , plural] of words) {
        node.words.push({ ...node.words[0], word, article, plural, definition: 'etwas anderes', alsoAccepted: [] })
      }
    }),
  })

  expect(errors.filter((problem) => problem.where?.endsWith('.plural'))).toEqual([])
})

test('a noun that the scope list gives no article ("none") takes none, and one with an article keeps it', async () => {
  const errors = await errorsAfter({
    [VOCABULARY]: changeNode((node) => {
      node.words[10].article = 'das'
      node.words[0].article = 'none'
    }),
  })

  expect(errors).toEqual(
    expect.arrayContaining([
      inWords('words[0].article', 'is "none", but the scope list gives "der" for "Tisch"'),
      inWords(
        'words[10].article',
        'is "das", but the scope list gives no article for "Deutschland"; write "article: none"',
      ),
    ]),
  )
})

test('a word the scope list gives two articles may take either', async () => {
  const errors = await errorsAfter({
    [SCOPE_LIST]: (text) => text.replace('Bett\tnoun\tA1\tdas\t-en', 'Bett\tnoun\tA1\tder/das\t-en'),
  })

  expect(errors.filter((problem) => problem.where?.endsWith('.article'))).toEqual([])
})

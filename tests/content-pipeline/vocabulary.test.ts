import { expect, test } from 'vitest'
import type { CompiledNode, VocabularyContent } from '../../src/content-model/index.ts'
import { SCOPE_LIST_FILE } from '../../src/content-model/scope-list.ts'
import { isVocabulary } from '../../src/content-model/scoring.ts'
import { type ContentProblem, compileContent } from '../../src/content-pipeline/index.ts'
import {
  COMING_SOON,
  changeNode,
  changeReviewedNode,
  fixtureContent,
  fixtureContentWith,
  VOCABULARY,
} from './fixture.ts'

/** The fixture's published vocabulary node: ten words about the home, the first of them "Tisch". */
const NODE = 'vocabulary-fixture-home'

/** The fixture's vocabulary node that is coming soon: three words, named and not written yet. */
const UNWRITTEN = 'nodes/vocabulary/vocabulary-fixture-family.yaml'

/** The errors of the fixture content after one change to the published vocabulary node. */
async function errorsAfter(change: Parameters<typeof changeNode>[0]) {
  const content = await fixtureContentWith({ [VOCABULARY]: changeNode(change) })
  return inNodes((await compileContent(content)).report.errors)
}

/**
 * The problems found in node files. A node file that breaks the schema is not
 * read, so the scope list then also reports each of its words as in no node;
 * those lines say nothing these tests are about.
 */
function inNodes(errors: ContentProblem[]): ContentProblem[] {
  return errors.filter((problem) => problem.file !== SCOPE_LIST_FILE)
}

/** The vocabulary content of a compiled node; the test fails when it has none. */
function vocabularyOf(node: CompiledNode | undefined): VocabularyContent {
  if (!node?.content || !isVocabulary(node.content)) throw new Error(`${node?.id} has no vocabulary content`)
  return node.content
}

const inWords = (where: string, message: string) => ({ file: VOCABULARY, node: NODE, where, message })

test('a published vocabulary node compiles into its words, each with all that its page shows', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(inNodes(report.errors)).toEqual([])
  const content = vocabularyOf(bundle?.nodes.find((node) => node.id === NODE))
  expect(content.words).toHaveLength(10)
  expect(content.words[0]).toEqual({
    word: 'Tisch',
    class: 'noun',
    article: 'der',
    plural: 'Tische',
    level: 'A1',
    meaning: { en: 'table', fa: 'میز' },
    definition: 'ein Möbelstück mit einer Platte und vier Beinen',
    example: { de: 'Das Essen steht auf dem Tisch.', en: 'The food is on the table.', fa: 'غذا روی میز است.' },
    alsoAccepted: [],
    tooCloseTo: [],
  })
  expect(content.words.find((word) => word.word === 'Möbel')).toMatchObject({
    article: 'die',
    number: 'plural-only',
    level: 'A2',
  })
  expect(content.words.find((word) => word.word === 'schlafen')).toMatchObject({ class: 'verb' })
})

test('its pool asks every word from German and into German, a noun with its article', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const content = vocabularyOf(bundle?.nodes.find((node) => node.id === NODE))
  expect(content?.questions).toHaveLength(20)
  expect(content?.attemptSize).toBe(10)
  const about = (word: string) => content?.questions.filter((question) => 'word' in question && question.word === word)
  expect(about('Tisch')).toEqual([
    expect.objectContaining({ type: 'meaning-of-word', prompt: 'der Tisch', answer: 'Tisch' }),
    expect.objectContaining({
      type: 'word-for-meaning',
      prompt: { en: 'table', fa: 'میز', de: 'ein Möbelstück mit einer Platte und vier Beinen' },
      answers: ['der Tisch'],
    }),
  ])
  expect(about('schlafen')?.[1]).toMatchObject({ answers: ['schlafen'] })
})

test('the tree and the checkpoint know that a published vocabulary node has a test', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const summary = (id: string) => bundle?.index.nodes.find((node) => node.id === id)
  expect(summary(NODE)?.hasTest).toBe(true)
  expect(summary('vocabulary-fixture-family')?.hasTest).toBe(false)
})

test('a vocabulary node that is coming soon may name its words and nothing more', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(inNodes(report.errors)).toEqual([])
  expect(bundle?.nodes.find((node) => node.id === 'vocabulary-fixture-family')).toMatchObject({
    status: 'coming-soon',
    content: null,
  })
})

test('a published vocabulary node whose word lacks a part is rejected, and the report names the word and the part', async () => {
  const errors = await errorsAfter((node) => {
    delete node.words[0].level
    delete node.words[1].meaning
    delete node.words[3].definition
    delete node.words[4].example
    delete node.words[8].class
  })

  expect(errors).toEqual([
    inWords('words[0].level', 'is required for a published node'),
    inWords('words[1].meaning', 'is required for a published node'),
    inWords('words[3].definition', 'is required for a published node'),
    inWords('words[4].example', 'is required for a published node'),
    inWords('words[8].class', 'is required for a published node'),
  ])
})

test('a meaning or an example that lacks a language is rejected', async () => {
  const errors = await errorsAfter((node) => {
    delete node.words[2].meaning.fa
    delete node.words[3].example.en
  })

  expect(errors).toEqual([
    inWords('words[2].meaning.fa', 'is missing; this text is needed in fa'),
    inWords('words[3].example.en', 'is missing; this text is needed in en'),
  ])
})

test('a published noun without its article or its plural is rejected', async () => {
  const errors = await errorsAfter((node) => {
    delete node.words[0].article
    delete node.words[1].plural
  })

  expect(errors).toEqual([
    inWords('words[0].article', 'is required for a published node: a noun is learned with its article'),
    inWords(
      'words[1].plural',
      'is required for a published node: the plural of the noun, or "number: singular-only" or "number: plural-only" in its place',
    ),
  ])
})

test('an article, a plural or a number on a word that is no noun is rejected', async () => {
  const errors = await errorsAfter((node) => {
    node.words[8].article = 'das'
    node.words[9].plural = 'große'
  })

  expect(errors).toEqual([
    inWords('words[8].article', 'only a noun has this, and this word is a verb'),
    inWords('words[9].plural', 'only a noun has this, and this word is an adjective'),
  ])
})

test('a noun states its plural or that it has one number only, not both; one with only a plural takes "die"', async () => {
  const errors = await errorsAfter((node) => {
    node.words[0].number = 'singular-only'
    node.words[7].article = 'das'
    node.words[1].plural = 'die Lampen'
  })

  expect(errors).toEqual([
    inWords('words[0].number', 'a noun with a plural has both numbers; give the plural or this, not both'),
    inWords('words[1].plural', 'is written without its article: "Lampen"'),
    inWords('words[7].article', 'a noun that has only a plural takes "die"'),
  ])
})

test('a definition that uses the word itself is rejected: a learner who reads in German is asked for the word by it', async () => {
  const errors = await errorsAfter((node) => {
    node.words[0].definition = 'Ein Tisch ist ein Möbelstück.'
    // Part of another word is fine: "Küchentisch" does not give "Küche" away as a whole word does.
    node.words[6].definition = 'das Zimmer mit dem Küchentisch'
  })

  expect(errors).toEqual([
    inWords(
      'words[0].definition',
      'uses the word "Tisch" itself; the definition is what a learner who reads in German is asked for the word by',
    ),
  ])
})

test('a word that is named as too close must be a word of the same node', async () => {
  const errors = await errorsAfter((node) => {
    node.words[0].tooCloseTo = ['Stuhl', 'Sessel']
  })

  expect(errors).toEqual([inWords('words[0].tooCloseTo[1]', '"Sessel" is not a word of this node')])
})

test('a vocabulary node writes no questions of its own', async () => {
  const errors = await errorsAfter((node) => {
    node.questions = [
      {
        id: 'q1',
        type: 'typed-answer',
        prompt: 'Plural: der Tisch',
        answers: ['die Tische'],
        explanation: { en: 'The plural.', fa: 'جمع.', de: 'Der Plural.' },
      },
    ]
  })

  expect(errors).toEqual([
    inWords('questions', 'a vocabulary node writes no questions: its test is made from its words'),
  ])
})

test('a vocabulary node must list words, and only a vocabulary node has them', async () => {
  const content = await fixtureContentWith({
    [UNWRITTEN]: changeNode((node) => {
      delete node.words
    }),
    [COMING_SOON]: changeNode((node) => {
      node.words = [{ word: 'Tisch' }]
    }),
  })

  const { report } = await compileContent(content)

  expect(inNodes(report.errors)).toEqual([
    { file: COMING_SOON, node: 'grammar-002', where: 'words', message: 'only a vocabulary node has this' },
    {
      file: UNWRITTEN,
      node: 'vocabulary-fixture-family',
      where: 'words',
      message: 'is missing: a vocabulary node lists its words',
    },
  ])
})

test('the id of a vocabulary node starts with "vocabulary-"', async () => {
  const content = await fixtureContentWith({
    [UNWRITTEN]: (text) => text.replace('id: vocabulary-fixture-family', 'id: fixture-family'),
  })

  const { report } = await compileContent(content)

  expect(inNodes(report.errors)).toEqual([
    {
      file: UNWRITTEN,
      node: 'fixture-family',
      where: 'id',
      message: 'a vocabulary node id is "vocabulary-" plus the name of its theme, like "vocabulary-family"',
    },
  ])
})

test('a published vocabulary node with too few words for a pool is rejected', async () => {
  const content = await fixtureContentWith({
    [VOCABULARY]: changeReviewedNode((node) => {
      node.words = node.words.slice(0, 7)
    }),
  })

  const { report } = await compileContent(content)

  expect(inNodes(report.errors)).toEqual([
    inWords(
      'words',
      'pool too small: a published node needs at least 15 questions, and the 7 words of this one give 14 (two for each word)',
    ),
  ])
})

test('two words of a node with the same meaning in a language are rejected: the test could not tell them apart', async () => {
  const content = await fixtureContentWith({
    [VOCABULARY]: changeReviewedNode((node) => {
      // "Lampe" gets the Persian meaning of "Tisch", and "Bett" the German definition of "Stuhl".
      node.words[1].meaning.fa = ' میز '
      node.words[2].definition = 'ein Möbelstück, auf dem eine Person sitzt'
    }),
  })

  const { report } = await compileContent(content)

  expect(inNodes(report.errors)).toEqual([
    inWords(
      'words[1].meaning.fa',
      '"Lampe" has the same meaning in fa as "Tisch" (words[0]): "میز". Asked for either, both would be right; tell them apart',
    ),
    inWords(
      'words[3].definition',
      '"Stuhl" has the same definition as "Bett" (words[2]): "ein Möbelstück, auf dem eine Person sitzt". Asked for either, both would be right; tell them apart',
    ),
  ])
})

test('two words with the same meaning that accept each other when asked for are allowed', async () => {
  const content = await fixtureContentWith({
    [VOCABULARY]: changeReviewedNode((node) => {
      node.words.push({
        ...node.words[1],
        word: 'Leuchte',
        plural: 'Leuchten',
        alsoAccepted: ['die Lampe'],
        tooCloseTo: ['Lampe'],
      })
      node.words[1].alsoAccepted = ['die Leuchte']
    }),
    [SCOPE_LIST_FILE]: (text) => `${text}Leuchte\tnoun\tA1\tdie\t-n\n`,
  })

  const { report } = await compileContent(content)

  expect(inNodes(report.errors)).toEqual([])
})

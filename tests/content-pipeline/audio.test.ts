import { rm } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import type { GrammarContent, PhrasesContent, VocabularyContent } from '../../src/content-model/index.ts'
import { hasPractice } from '../../src/content-model/scoring.ts'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContent, fixtureContentWith, PUBLISHED } from './fixture.ts'

/**
 * The keys below were worked out outside the code, as the first 16 hex
 * digits of `printf '<voice>\n<spoken text>' | shasum -a 256`.
 */
const ICH_WOHNE_IN_BERLIN = '16af11d6bd373d3d'
const DER_TISCH = 'a22a5e6927988b84'
const DU_WOHNST_HIER = 'a5ab113f6d6d9121'
const GUTEN_TAG = 'f68b933d2ec7985b'
/** The first line of the fixture listening part, which Lena says in Kerstin's voice. */
const HALLO_JONAS = 'c09f5744233f9743'
/** The same texts in the second voice, which a learner may choose for everything one person says. */
const ICH_WOHNE_IN_BERLIN_KERSTIN = '7610892bd4157192'
const DER_TISCH_KERSTIN = '84bae78c624b0298'
const DU_WOHNST_HIER_KERSTIN = 'c2195c89a8bdfb52'
const GUTEN_TAG_KERSTIN = 'ffb6be74fd2eb151'

async function compiledFixture() {
  const { report, bundle } = await compileContent(fixtureContent)
  expect(report.errors).toEqual([])
  const content = (id: string) => bundle?.nodes.find((node) => node.id === id)?.content
  return { content }
}

test('every German example of a published grammar node carries the audio that says it, in each voice a learner may choose', async () => {
  const { content } = await compiledFixture()
  const grammar = content('grammar-001') as GrammarContent

  expect(grammar.examples[0]?.audio).toEqual({
    key: ICH_WOHNE_IN_BERLIN,
    voice: 'thorsten',
    text: 'Ich wohne in Berlin.',
    byVoice: { thorsten: ICH_WOHNE_IN_BERLIN, kerstin: ICH_WOHNE_IN_BERLIN_KERSTIN },
  })
})

test('the right sentence of a common mistake carries its audio; the wrong one is never said', async () => {
  const { content } = await compiledFixture()
  const [mistake] = (content('grammar-001') as GrammarContent).mistakes

  expect(mistake?.wrong).toBe('Du wohne hier.')
  expect(mistake?.audio).toEqual({
    key: DU_WOHNST_HIER,
    voice: 'thorsten',
    text: 'Du wohnst hier.',
    byVoice: { thorsten: DU_WOHNST_HIER, kerstin: DU_WOHNST_HIER_KERSTIN },
  })
})

test('a vocabulary word is heard with its article, and its example sentence on its own', async () => {
  const { content } = await compiledFixture()
  const words = (content('vocabulary-fixture-home') as VocabularyContent).words

  expect(words[0]?.audio).toEqual({
    key: DER_TISCH,
    voice: 'thorsten',
    text: 'der Tisch',
    byVoice: { thorsten: DER_TISCH, kerstin: DER_TISCH_KERSTIN },
  })
  expect(words[0]?.example.audio).toMatchObject({ voice: 'thorsten', text: 'Das Essen steht auf dem Tisch.' })
})

test('the example of each phrase carries its audio', async () => {
  const { content } = await compiledFixture()
  const phrases = (content('phrases-greeting') as PhrasesContent).phrases

  expect(phrases[0]?.example.audio).toMatchObject({ voice: 'thorsten', text: 'Guten Tag, Frau Test!' })
})

test('a phrase itself carries its audio too', async () => {
  const { content } = await compiledFixture()
  const phrases = (content('phrases-greeting') as PhrasesContent).phrases

  expect(phrases[0]?.audio).toEqual({
    key: GUTEN_TAG,
    voice: 'thorsten',
    text: 'Guten Tag!',
    byVoice: { thorsten: GUTEN_TAG, kerstin: GUTEN_TAG_KERSTIN },
  })
})

test('a published example without its audio file is an error that names the node, the place, the text and the file', async () => {
  const content = await fixtureContentWith({})
  await rm(path.join(content, 'audio', `${ICH_WOHNE_IN_BERLIN}.mp3`))

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'examples[0]',
      message: `has no audio for "Ich wohne in Berlin." in the voice thorsten (audio/${ICH_WOHNE_IN_BERLIN}.mp3): run pnpm audio:generate`,
    },
  ])
  expect(bundle).toBeNull()
})

test('a published example with its file in only one voice is an error: the play button would be silent in the other', async () => {
  const content = await fixtureContentWith({})
  await rm(path.join(content, 'audio', `${ICH_WOHNE_IN_BERLIN_KERSTIN}.mp3`))

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'examples[0]',
      message: `has no audio for "Ich wohne in Berlin." in the voice kerstin (audio/${ICH_WOHNE_IN_BERLIN_KERSTIN}.mp3): run pnpm audio:generate`,
    },
  ])
})

test('a line of a conversation needs only the voice of its speaker, whatever voice the learner chose', async () => {
  const { content } = await compiledFixture()
  const listening = content('exam-hoeren-3')
  if (!listening || !hasPractice(listening)) throw new Error('the fixture listening part has no practice tasks')
  const [text] = listening.practice[0]?.texts ?? []
  if (!text || !('lines' in text)) throw new Error('the fixture conversation has no lines')

  // Lena speaks in Kerstin's voice only: there is no file of her line in Thorsten's, and none is asked for.
  expect(text.lines[0]?.audio).toEqual({
    key: HALLO_JONAS,
    voice: 'kerstin',
    text: 'Hallo Jonas, schön, dich zu sehen! Wie war dein Urlaub?',
  })
})

test('a changed example needs new audio in both voices: the files of the old text do not serve it', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.examples[0].de = 'Ich wohne in Hamburg.'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map((error) => [error.node, error.where, error.message.match(/in the voice \S+/)?.[0]])).toEqual(
    [
      ['grammar-001', 'examples[0]', 'in the voice thorsten'],
      ['grammar-001', 'examples[0]', 'in the voice kerstin'],
    ],
  )
})

test('a "coming soon" node needs no audio, since its page is not shown', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.examples = [{ de: 'Das ist neu.', en: 'This is new.', fa: 'این تازه است.' }]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})

test('spoken German with a number the voice would misread is an error, also before its audio exists', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.examples[1].de = 'Wir treffen uns am 3.5.2025.'
    }),
  })

  const { report } = await compileContent(content, { requireAudio: false })

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'examples[1]',
      message: 'holds a number that the voice would misread ("3.5.2025"): write it in words',
    },
  ])
})

test('a word the voice misreads is respelt only in what the voice says: the learner sees it as written', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.examples[0].de = 'Mein Hals tut weh.'
    }),
  })

  const { bundle } = await compileContent(content, { requireAudio: false })
  const [example] = (bundle?.nodes.find((node) => node.id === 'grammar-001')?.content as GrammarContent).examples

  expect(example?.de).toBe('Mein Hals tut weh.')
  expect(example?.audio.text).toBe('Mein Halls tut weh.')
})

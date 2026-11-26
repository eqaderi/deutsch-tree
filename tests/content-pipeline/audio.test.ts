import { rm } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import type { GrammarContent, PhrasesContent, VocabularyContent } from '../../src/content-model/index.ts'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContent, fixtureContentWith, PUBLISHED } from './fixture.ts'

/**
 * The keys below were worked out outside the code, as the first 16 hex
 * digits of `printf '<voice>\n<spoken text>' | shasum -a 256`.
 */
const ICH_WOHNE_IN_BERLIN = '16af11d6bd373d3d'
const DER_TISCH = 'a22a5e6927988b84'

async function compiledFixture() {
  const { report, bundle } = await compileContent(fixtureContent)
  expect(report.errors).toEqual([])
  const content = (id: string) => bundle?.nodes.find((node) => node.id === id)?.content
  return { content }
}

test('every German example of a published grammar node carries the audio that says it, in the main voice', async () => {
  const { content } = await compiledFixture()
  const grammar = content('grammar-001') as GrammarContent

  expect(grammar.examples[0]?.audio).toEqual({
    key: ICH_WOHNE_IN_BERLIN,
    voice: 'thorsten',
    text: 'Ich wohne in Berlin.',
  })
})

test('a vocabulary word is heard with its article, and its example sentence on its own', async () => {
  const { content } = await compiledFixture()
  const words = (content('vocabulary-fixture-home') as VocabularyContent).words

  expect(words[0]?.audio).toEqual({ key: DER_TISCH, voice: 'thorsten', text: 'der Tisch' })
  expect(words[0]?.example.audio).toMatchObject({ voice: 'thorsten', text: 'Das Essen steht auf dem Tisch.' })
})

test('the example of each phrase carries its audio', async () => {
  const { content } = await compiledFixture()
  const phrases = (content('phrases-greeting') as PhrasesContent).phrases

  expect(phrases[0]?.example.audio).toMatchObject({ voice: 'thorsten', text: 'Guten Tag, Frau Test!' })
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
      message: `has no audio for "Ich wohne in Berlin." (audio/${ICH_WOHNE_IN_BERLIN}.mp3): run pnpm audio:generate`,
    },
  ])
  expect(bundle).toBeNull()
})

test('a changed example needs new audio: the file of the old text does not serve it', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.examples[0].de = 'Ich wohne in Hamburg.'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map((error) => [error.node, error.where])).toEqual([['grammar-001', 'examples[0]']])
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

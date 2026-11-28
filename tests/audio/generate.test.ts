import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { generateAudio, type Synthesiser } from '../../src/audio/generate.ts'
import type { Spoken } from '../../src/content-model/audio.ts'
import { changeNode, fixtureContentWith, PUBLISHED, VOCABULARY } from '../content-pipeline/fixture.ts'

/**
 * The command that generates audio, run on a copy of the fixture content
 * with a stand-in for Piper. The stand-in "says" a text by writing its voice
 * and its words, so a test can read back which file holds what.
 */
function fakeVoice() {
  const said: Spoken[] = []
  const synthesise: Synthesiser = async (item) => {
    said.push(item)
    return new TextEncoder().encode(`${item.voice}: ${item.text}`)
  }
  return { said, synthesise }
}

/** A copy of the fixture content with no audio at all, as before the first run. */
async function contentWithoutAudio(edits: Record<string, (text: string) => string> = {}): Promise<string> {
  const dir = await fixtureContentWith({ ...edits, 'audio/.keep': () => 'placeholder' })
  await rm(path.join(dir, 'audio'), { recursive: true, force: true })
  return dir
}

/** Changes a file of a content folder in place, as a maintainer does between two runs. */
async function editIn(dir: string, file: string, edit: (text: string) => string) {
  const target = path.join(dir, file)
  await writeFile(target, edit(await readFile(target, 'utf8')))
}

const audioFiles = async (dir: string) => (await readdir(path.join(dir, 'audio'))).sort()
const fileText = (dir: string, key: string) => readFile(path.join(dir, 'audio', `${key}.mp3`), 'utf8')

test('the first run says every example and word of the published nodes once in each voice, and writes one file for each', async () => {
  const dir = await contentWithoutAudio()
  const { said, synthesise } = fakeVoice()

  const report = await generateAudio(dir, synthesise)

  expect(report.errors).toEqual([])
  const texts = said.map((item) => item.text)
  expect(texts).toContain('Ich wohne in Berlin.')
  expect(texts).toContain('der Tisch')
  expect(texts).toContain('Das Essen steht auf dem Tisch.')
  expect(texts).toContain('Guten Tag, Frau Test!')
  // German that stands in several places is said once in each voice.
  const voiced = said.map((item) => `${item.voice}: ${item.text}`)
  expect(new Set(voiced).size).toBe(voiced.length)
  expect(report.made).toHaveLength(said.length)
  expect(await audioFiles(dir)).toEqual(said.map((item) => `${item.key}.mp3`).sort())
  expect(await fileText(dir, '16af11d6bd373d3d')).toBe('thorsten: Ich wohne in Berlin.')
})

test('what one person says is said in both voices a learner may choose; a line of a conversation only in its speaker’s', async () => {
  const dir = await contentWithoutAudio()
  const { said, synthesise } = fakeVoice()

  await generateAudio(dir, synthesise)

  const voicesOf = (text: string) => said.filter((item) => item.text === text).map((item) => item.voice)
  expect(voicesOf('Ich wohne in Berlin.')).toEqual(['thorsten', 'kerstin'])
  expect(voicesOf('der Tisch')).toEqual(['thorsten', 'kerstin'])
  expect(voicesOf('Guten Tag!')).toEqual(['thorsten', 'kerstin'])
  expect(voicesOf('Hallo Jonas, schön, dich zu sehen! Wie war dein Urlaub?')).toEqual(['kerstin'])
  // The keys were worked out with `printf 'kerstin\n<text>' | shasum -a 256`.
  expect(await fileText(dir, '7610892bd4157192')).toBe('kerstin: Ich wohne in Berlin.')
})

test('a "coming soon" node has no page yet, so nothing of it is said, and the files of a node set back are removed', async () => {
  const dir = await contentWithoutAudio()
  await generateAudio(dir, fakeVoice().synthesise)
  const before = await audioFiles(dir)
  await editIn(
    dir,
    VOCABULARY,
    changeNode((node) => {
      node.status = 'coming-soon'
    }),
  )
  const { said, synthesise } = fakeVoice()

  const report = await generateAudio(dir, synthesise)

  expect(said).toEqual([])
  expect(report.removed).toContain('a22a5e6927988b84') // "der Tisch"
  expect(await audioFiles(dir)).toEqual(before.filter((file) => !report.removed.includes(file.replace('.mp3', ''))))
})

test('each line of a conversation is said in the voice of its speaker', async () => {
  const dir = await contentWithoutAudio()

  await generateAudio(dir, fakeVoice().synthesise)

  // The first two lines of the fixture listening part: Lena (Kerstin), then Jonas (Thorsten).
  expect(await fileText(dir, 'c09f5744233f9743')).toBe(
    'kerstin: Hallo Jonas, schön, dich zu sehen! Wie war dein Urlaub?',
  )
  expect(await fileText(dir, '9d0cd9a15da89407')).toBe(
    'thorsten: Danke, sehr gut. Ich war zwei Wochen am Meer, in Kiel.',
  )
})

test('a second run says nothing when no text changed', async () => {
  const dir = await contentWithoutAudio()
  const first = await generateAudio(dir, fakeVoice().synthesise)
  const { said, synthesise } = fakeVoice()

  const report = await generateAudio(dir, synthesise)

  expect(said).toEqual([])
  expect(report.made).toEqual([])
  expect(report.kept).toHaveLength(first.made.length)
})

test('a changed example gets new audio, its old file is removed, and nothing else is said again', async () => {
  const dir = await contentWithoutAudio()
  await generateAudio(dir, fakeVoice().synthesise)
  await editIn(
    dir,
    PUBLISHED,
    changeNode((node) => {
      node.examples[0].de = 'Ich wohne in Hamburg.'
    }),
  )
  const { said, synthesise } = fakeVoice()

  const report = await generateAudio(dir, synthesise)

  expect(said.map((item) => `${item.voice}: ${item.text}`)).toEqual([
    'thorsten: Ich wohne in Hamburg.',
    'kerstin: Ich wohne in Hamburg.',
  ])
  expect(report.removed).toEqual(['16af11d6bd373d3d', '7610892bd4157192'])
  expect(await audioFiles(dir)).not.toContain('16af11d6bd373d3d.mp3')
})

test('a number is said as words, and the same words with digits or in letters are one file', async () => {
  const dir = await contentWithoutAudio({
    [VOCABULARY]: changeNode((node) => {
      node.words[0].example.de = 'Der Tisch ist 85 Jahre alt.'
      node.words[1].example.de = 'Der Tisch ist fünfundachtzig Jahre alt.'
    }),
  })
  const { said, synthesise } = fakeVoice()

  await generateAudio(dir, synthesise)

  const spokenTwice = said.filter((item) => item.text.includes('Jahre alt'))
  expect(spokenTwice.map((item) => `${item.voice}: ${item.text}`)).toEqual([
    'thorsten: Der Tisch ist fünfundachtzig Jahre alt.',
    'kerstin: Der Tisch ist fünfundachtzig Jahre alt.',
  ])
})

test('--force says everything again, and --redo says only the files named', async () => {
  const dir = await contentWithoutAudio()
  const first = await generateAudio(dir, fakeVoice().synthesise)

  const again = fakeVoice()
  await generateAudio(dir, again.synthesise, { force: true })
  expect(again.said).toHaveLength(first.made.length)

  const one = fakeVoice()
  const report = await generateAudio(dir, one.synthesise, { redo: ['16af11d6bd373d3d'] })
  expect(one.said.map((item) => item.text)).toEqual(['Ich wohne in Berlin.'])
  expect(report.made).toEqual(['16af11d6bd373d3d'])
})

test('content with errors gets no audio, and the errors are reported', async () => {
  const dir = await contentWithoutAudio({
    [PUBLISHED]: (text) => text.replace('kind: grammar', 'kind: grammer'),
  })
  const { said, synthesise } = fakeVoice()

  const report = await generateAudio(dir, synthesise)

  expect(said).toEqual([])
  expect(report.errors).toHaveLength(1)
})

test('a word the voice misreads is respelt in what the voice is given, and the file is that of the respelt text', async () => {
  const dir = await contentWithoutAudio({
    [VOCABULARY]: changeNode((node) => {
      node.words[0].example.de = 'Ich bin wieder fit.'
    }),
  })
  const { said, synthesise } = fakeVoice()

  await generateAudio(dir, synthesise)

  expect(said.filter((item) => item.text.includes('wieder')).map((item) => `${item.voice}: ${item.text}`)).toEqual([
    'thorsten: Ich bin wieder fitt.',
    'kerstin: Ich bin wieder fitt.',
  ])
  // The key of the respelt text (`printf 'thorsten\nIch bin wieder fitt.' | shasum -a 256`), so a
  // changed respelling gives the item a new file and the old one is removed.
  expect(await fileText(dir, '5c1b4f582d1d97bc')).toBe('thorsten: Ich bin wieder fitt.')
})

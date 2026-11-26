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

test('the first run says every example and word of the published nodes once, and writes one file for each', async () => {
  const dir = await contentWithoutAudio()
  const { said, synthesise } = fakeVoice()

  const report = await generateAudio(dir, synthesise)

  expect(report.errors).toEqual([])
  const texts = said.map((item) => item.text)
  expect(texts).toContain('Ich wohne in Berlin.')
  expect(texts).toContain('der Tisch')
  expect(texts).toContain('Das Essen steht auf dem Tisch.')
  expect(texts).toContain('Guten Tag, Frau Test!')
  // A "coming soon" node has no page yet, so nothing of it is spoken.
  expect(new Set(texts).size).toBe(texts.length)
  expect(report.made).toHaveLength(said.length)
  expect(await audioFiles(dir)).toEqual(said.map((item) => `${item.key}.mp3`).sort())
  expect(await fileText(dir, '16af11d6bd373d3d')).toBe('thorsten: Ich wohne in Berlin.')
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

  expect(said.map((item) => item.text)).toEqual(['Ich wohne in Hamburg.'])
  expect(report.removed).toEqual(['16af11d6bd373d3d'])
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
  expect(spokenTwice.map((item) => item.text)).toEqual(['Der Tisch ist fünfundachtzig Jahre alt.'])
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

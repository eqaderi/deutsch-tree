/**
 * Generates the audio of a content folder: every piece of German of the
 * published nodes and mock exams that carries audio gets a file `audio/<key>.mp3`.
 *
 * A file that exists is kept, so a second run says only what is new or
 * changed. A file that no content needs any more is removed. Which voice
 * engine says the text is passed in (`Synthesiser`): Piper for the real
 * content (piper.ts), a stand-in in tests, a silent file for the fixtures.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AUDIO_FOLDER, type Spoken } from '../content-model/audio.ts'
import { presentAudio } from '../content-pipeline/audio.ts'
import { type ContentProblem, compileContent } from '../content-pipeline/index.ts'
import { type SpokenItem, spokenInBundle } from './index.ts'

/** Says one text in one voice and gives back the MP3 file. */
export type Synthesiser = (item: Spoken) => Promise<Uint8Array>

export interface GenerateOptions {
  /** Say everything again, also what has a file (after a voice model changed). */
  force?: boolean
  /** Keys to say again although they have a file (a slip of the voice heard on one item). */
  redo?: readonly string[]
  /** Told of each file as it is made, for a progress line. */
  onMade?: (item: SpokenItem, done: number, total: number) => void
}

export interface GenerateReport {
  /** Errors of the content; while there are any, no audio is generated. */
  errors: ContentProblem[]
  /** Keys whose files were made in this run. */
  made: string[]
  /** Keys whose files were there and were kept. */
  kept: string[]
  /** Keys whose files no content needs any more, and which were removed. */
  removed: string[]
}

export async function generateAudio(
  contentDir: string,
  synthesise: Synthesiser,
  options: GenerateOptions = {},
): Promise<GenerateReport> {
  const { report, bundle } = await compileContent(contentDir, { requireAudio: false })
  if (!bundle) return { errors: report.errors, made: [], kept: [], removed: [] }

  // The same words in the same voice are one file, wherever they stand.
  const items = [...new Map(spokenInBundle(bundle).map((item) => [item.key, item])).values()]
  const audioDir = path.join(contentDir, AUDIO_FOLDER)
  await mkdir(audioDir, { recursive: true })
  const present = await presentAudio(contentDir)

  const redo = new Set(options.redo ?? [])
  const toSay = items.filter((item) => options.force || redo.has(item.key) || !present.has(item.key))
  const made: string[] = []
  for (const item of toSay) {
    const { node: _node, where: _where, ...said } = item
    await writeFile(path.join(audioDir, `${item.key}.mp3`), await synthesise(said))
    made.push(item.key)
    options.onMade?.(item, made.length, toSay.length)
  }

  const needed = new Set(items.map((item) => item.key))
  const removed = [...present].filter((key) => !needed.has(key)).sort()
  for (const key of removed) await rm(path.join(audioDir, `${key}.mp3`))

  const kept = items.map((item) => item.key).filter((key) => present.has(key) && !made.includes(key))
  return { errors: [], made, kept, removed }
}

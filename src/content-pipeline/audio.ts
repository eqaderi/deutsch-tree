/**
 * The audio rules of the content pipeline. They look at the compiled nodes,
 * because what is spoken is what the compiled page carries as `audio`
 * (see `spokenItems` in src/audio), so they run after compiling and are not
 * in `checks/`, which look at node files.
 *
 * - Spoken German must not hold a number that was not written as words: the
 *   voice misreads digits.
 * - Every spoken item of a published node must have its file,
 *   `audio/<key>.mp3`. `pnpm audio:generate` makes the missing ones.
 *
 * Neither rule needs Piper: the key is a hash of the text and the voice.
 */
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { spokenItems } from '../audio/index.ts'
import { AUDIO_FOLDER, audioFile } from '../content-model/audio.ts'
import type { ContentProblem } from './checks/index.ts'

/**
 * The problems of the audio of the compiled nodes and mock exams (anything
 * with an `id` and its compiled `content`). `present` holds the keys
 * whose files exist, or is null when the files are not looked at (while
 * audio is being generated).
 */
export function audioProblems(
  nodes: ReadonlyArray<{ id: string; content: unknown }>,
  fileOf: ReadonlyMap<string, string>,
  present: ReadonlySet<string> | null,
): ContentProblem[] {
  const problems: ContentProblem[] = []
  for (const item of spokenItems(nodes)) {
    const at = { file: fileOf.get(item.node) ?? '', node: item.node, where: item.where }
    const number = item.text.match(/\S*\d\S*/)?.[0].replace(/[.,!?;:]+$/, '')
    if (number) {
      problems.push({ ...at, message: `holds a number that the voice would misread ("${number}"): write it in words` })
    } else if (present && !present.has(item.key)) {
      problems.push({
        ...at,
        message: `has no audio for "${item.text}" (${audioFile(item.key)}): run pnpm audio:generate`,
      })
    }
  }
  return problems
}

/** The keys whose audio files the content folder holds. */
export async function presentAudio(contentDir: string): Promise<Set<string>> {
  const files = await readdir(path.join(contentDir, AUDIO_FOLDER)).catch(() => [] as string[])
  return new Set(files.filter((file) => file.endsWith('.mp3')).map((file) => file.slice(0, -'.mp3'.length)))
}

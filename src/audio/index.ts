/**
 * Audio: from German in the compiled content to the audio files that say it.
 *
 * `spoken(text, voice)` is what the content pipeline attaches as `audio` to
 * every piece of German that has a play button. Its key is a hash of the
 * voice and the spoken text, never of the audio, so it is known without
 * Piper, the same text always has the same file, and a changed text gets a
 * new one. `spokenItems(nodes)` finds everything that carries one (in nodes
 * and mock exams alike: `spokenInBundle`), so the
 * pipeline's check and the command that generates audio (cli.ts) agree on
 * what is spoken without a list of their own.
 */
import { createHash } from 'node:crypto'
import { DEFAULT_VOICE, type Spoken, VOICE_IDS, type VoiceId } from '../content-model/audio.ts'
import type { ContentBundle } from '../content-model/index.ts'
import { speakable } from './speakable.ts'

/** How many hex digits of the hash name a file: 64 bits, so thousands of files never share one. */
const KEY_LENGTH = 16

/** The audio of a piece of German, said by a voice (by default the main one). */
export function spoken(text: string, voice: VoiceId = DEFAULT_VOICE): Spoken {
  const said = speakable(text)
  const key = createHash('sha256').update(`${voice}\n${said}`).digest('hex').slice(0, KEY_LENGTH)
  return { key, voice, text: said }
}

/** A spoken item with the node it belongs to and its place in the node's page content ("examples[0]"). */
export interface SpokenItem extends Spoken {
  node: string
  where: string
}

/**
 * Every piece of German in the nodes that carries audio, in the order of the
 * nodes and their content. Found by its `audio` field, so new content that
 * carries audio (a dialogue line with its own voice) needs nothing here.
 */
export function spokenItems(nodes: ReadonlyArray<{ id: string; content: unknown }>): SpokenItem[] {
  const items: SpokenItem[] = []
  const visit = (value: unknown, node: string, where: string) => {
    if (Array.isArray(value)) {
      value.forEach((inner, index) => {
        visit(inner, node, `${where}[${index}]`)
      })
      return
    }
    if (typeof value !== 'object' || value === null) return
    const { audio } = value as { audio?: unknown }
    if (isSpoken(audio)) items.push({ ...audio, node, where })
    for (const [field, inner] of Object.entries(value)) {
      if (field !== 'audio') visit(inner, node, where === '' ? field : `${where}.${field}`)
    }
  }
  for (const node of nodes) visit(node.content, node.id, '')
  return items
}

/** Everything a compiled bundle says aloud: its nodes, then its mock exams. */
export function spokenInBundle(bundle: Pick<ContentBundle, 'nodes' | 'mockExams'>): SpokenItem[] {
  return spokenItems([...bundle.nodes, ...bundle.mockExams])
}

function isSpoken(value: unknown): value is Spoken {
  const candidate = value as Partial<Spoken> | null | undefined
  return (
    typeof candidate?.key === 'string' &&
    typeof candidate.text === 'string' &&
    (VOICE_IDS as readonly unknown[]).includes(candidate.voice)
  )
}

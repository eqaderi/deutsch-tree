/**
 * Audio: from German in the compiled content to the audio files that say it.
 *
 * `spoken(text)` is what the content pipeline attaches as `audio` to every
 * piece of German that one person says (an example, a word, a phrase, the
 * right sentence of a mistake): it has a key in each voice the learner may
 * choose. `spokenBy(text, voice)` is a line of a dialogue, said only in the
 * voice of its speaker. A key is a hash of the voice and the spoken text,
 * never of the audio, so it is known without Piper, the same text always has
 * the same file, and a changed text gets a new one. `spokenItems(nodes)`
 * finds everything that carries audio (in nodes and mock exams alike:
 * `spokenInBundle`), one item per voice, so the pipeline's check and the
 * command that generates audio (cli.ts) agree on what is spoken without a
 * list of their own.
 */
import { createHash } from 'node:crypto'
import {
  CHOOSABLE_VOICES,
  type ChoosableVoice,
  DEFAULT_VOICE,
  type Spoken,
  VOICE_IDS,
  type VoiceId,
} from '../content-model/audio.ts'
import type { ContentBundle } from '../content-model/index.ts'
import { speakable } from './speakable.ts'

/** How many hex digits of the hash name a file: 64 bits, so thousands of files never share one. */
const KEY_LENGTH = 16

/** The audio of German that one person says: in the main voice, with its key in each voice the learner may choose. */
export function spoken(text: string): Spoken {
  const byVoice = Object.fromEntries(CHOOSABLE_VOICES.map((voice) => [voice, spokenBy(text, voice).key])) as Record<
    ChoosableVoice,
    string
  >
  return { ...spokenBy(text, DEFAULT_VOICE), byVoice }
}

/** The audio of a line of a dialogue: said in the voice of its speaker only, whatever the learner chose. */
export function spokenBy(text: string, voice: VoiceId): Spoken {
  const said = speakable(text)
  const key = createHash('sha256').update(`${voice}\n${said}`).digest('hex').slice(0, KEY_LENGTH)
  return { key, voice, text: said }
}

/**
 * One file that a page can play: a text in one voice, with the node it
 * belongs to and its place in the node's page content ("examples[0]").
 */
export interface SpokenItem {
  key: string
  voice: VoiceId
  text: string
  node: string
  where: string
}

/**
 * Every file the nodes can play, in the order of the nodes and their
 * content: a piece of German one person says once per voice the learner may
 * choose, a line of a dialogue in its speaker's voice. Found by the `audio`
 * field, so new content that carries audio needs nothing here.
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
    if (isSpoken(audio)) items.push(...inEachVoice(audio).map((said) => ({ ...said, node, where })))
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

/** A piece of audio as the files that hold it: one per voice it is said in. */
function inEachVoice({ key, voice, text, byVoice }: Spoken): Array<Pick<SpokenItem, 'key' | 'voice' | 'text'>> {
  if (!byVoice) return [{ key, voice, text }]
  return CHOOSABLE_VOICES.map((each) => ({ key: byVoice[each], voice: each, text }))
}

function isSpoken(value: unknown): value is Spoken {
  const candidate = value as Partial<Spoken> | null | undefined
  return (
    typeof candidate?.key === 'string' &&
    typeof candidate.text === 'string' &&
    (VOICE_IDS as readonly unknown[]).includes(candidate.voice)
  )
}

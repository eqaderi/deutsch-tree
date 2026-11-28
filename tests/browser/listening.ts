/**
 * Helpers for journeys that hear German. The fixture's audio files are a
 * quarter of a second of silence each, named by the key of what they say.
 */
import type { Page } from '@playwright/test'
import { spokenLines } from '../../src/audio/index.ts'
import { audioFile, voiceSchema } from '../../src/content-model/audio.ts'
import type { FixtureText } from './taking-a-task.ts'

/** Every audio file the page asks for, as the path after the site's `content/` folder. */
export function audioRequests(page: Page): string[] {
  const asked: string[] = []
  page.on('request', (request) => {
    const match = new URL(request.url()).pathname.match(/\/content\/(audio\/.+)$/)
    if (match?.[1]) asked.push(match[1])
  })
  return asked
}

export interface Heard {
  /** The files the browser played to their end, in order, as the path after the site's `content/` folder. */
  played: string[]
  /** What was given to the browser's built-in speech, which the app must never use. */
  builtInSpeech: string[]
}

/** Records what the page plays, and every use of the browser's built-in speech. Call it before the page loads. */
export async function listen(page: Page): Promise<() => Promise<Heard>> {
  await page.addInitScript(() => {
    const heard: Heard = { played: [], builtInSpeech: [] }
    ;(window as unknown as { heard: Heard }).heard = heard
    // An element may play several files one after the other; it is listened to once.
    const listened = new WeakSet<HTMLMediaElement>()
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!listened.has(this)) {
        listened.add(this)
        this.addEventListener('ended', () => {
          const path = new URL(this.currentSrc).pathname
          heard.played.push(path.match(/\/content\/(audio\/.+)$/)?.[1] ?? path)
        })
      }
      return play.call(this)
    }
    window.speechSynthesis.speak = (utterance) => {
      heard.builtInSpeech.push(utterance.text)
    }
  })
  return () => page.evaluate(() => (window as unknown as { heard: Heard }).heard)
}

/**
 * The audio files of the lines of a conversation, in the order of the lines,
 * as the path after the site's `content/` folder (as `Heard.played` holds
 * them): keyed by the pipeline's own rule, so a test hears what it compiled.
 */
export function lineFiles(text: FixtureText): string[] {
  const speakers = (text.speakers ?? []).map(({ name, voice }) => ({ name, voice: voiceSchema.parse(voice) }))
  return spokenLines(speakers, text.lines ?? []).map((line) => audioFile(line.key))
}

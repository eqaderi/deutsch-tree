/**
 * Helpers for journeys that hear German. The fixture's audio files are a
 * quarter of a second of silence each, named by the key of what they say.
 */
import type { Page } from '@playwright/test'

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
  /** The files the browser played to their end, in order. */
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
        this.addEventListener('ended', () => heard.played.push(new URL(this.currentSrc).pathname))
      }
      return play.call(this)
    }
    window.speechSynthesis.speak = (utterance) => {
      heard.builtInSpeech.push(utterance.text)
    }
  })
  return () => page.evaluate(() => (window as unknown as { heard: Heard }).heard)
}

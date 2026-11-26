/**
 * The play button of a piece of German. It plays the stored audio file
 * (`content/audio/<key>.mp3`), never the browser's own speech, so the voice
 * is the same on every device. Nothing is downloaded until the learner
 * presses it, and one piece plays at a time.
 *
 * It takes the `audio` that the content pipeline attached to the German
 * (`Spoken`), so anything that carries one can have a button: an example,
 * a word, and later a line of a dialogue in its own voice.
 */
import { useEffect, useRef, useState } from 'react'
import { audioFile, type Spoken } from '../content-model/audio.ts'
import type { HeardExample } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { German } from './German.tsx'

type State = 'idle' | 'playing' | 'failed'

/** The one sound playing on the page, so that pressing another button stops it. */
let playing: { sound: HTMLAudioElement; stop: () => void } | null = null

export function PlayButton({ audio }: { audio: Spoken }) {
  const { strings } = useLanguage()
  const [state, setState] = useState<State>('idle')
  const stopRef = useRef<(() => void) | null>(null)

  // A page that is left stops what it plays.
  useEffect(() => () => stopRef.current?.(), [])

  const play = () => {
    playing?.stop()
    const sound = new Audio(new URL(`content/${audioFile(audio.key)}`, document.baseURI).href)
    const stop = () => {
      sound.pause()
      if (playing?.sound === sound) playing = null
      stopRef.current = null
      setState((current) => (current === 'playing' ? 'idle' : current))
    }
    const fail = () => {
      stop()
      setState('failed')
    }
    playing = { sound, stop }
    stopRef.current = stop
    sound.addEventListener('ended', stop)
    sound.addEventListener('error', fail)
    setState('playing')
    sound.play().catch(fail)
  }

  const isPlaying = state === 'playing'
  return (
    <>
      <button
        type="button"
        className="play"
        aria-label={isPlaying ? strings.stopListening : strings.listen}
        onClick={isPlaying ? () => stopRef.current?.() : play}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          {isPlaying ? <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" /> : <path d="M5 2.8v10.4L13.2 8z" />}
        </svg>
      </button>
      {state === 'failed' && (
        <span role="status" className="play-failed">
          {strings.audioFailed}
        </span>
      )}
    </>
  )
}

/**
 * An example as every page shows it: its play button, the German, and the
 * translation in the learner's language. Its parent element takes the
 * classes `example heard`.
 */
export function SpokenExample({ example }: { example: HeardExample }) {
  const { language } = useLanguage()
  return (
    <>
      <PlayButton audio={example.audio} />
      <German>{example.de}</German>
      {/* A learner reading in German needs no translation. */}
      {language !== 'de' && <small>{example[language]}</small>}
    </>
  )
}

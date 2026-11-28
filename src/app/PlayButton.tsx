/**
 * The play buttons of German. They play the stored audio files
 * (`content/audio/<key>.mp3`), never the browser's own speech, so the voice
 * is the same on every device. Nothing is downloaded until the learner
 * presses one, and one piece plays at a time on the whole page.
 *
 * `PlayButton` takes the `audio` that the content pipeline attached to a
 * piece of German (`Spoken`): an example, a word, a line of a conversation.
 * What one person says plays in the voice the learner chose (`voice` in the
 * progress, `VoiceSwitch.tsx`); a line of a conversation in its speaker's.
 * `PlayRecording` plays the lines of a heard text one after the other, each
 * in its speaker's voice, as the recording of a listening task.
 */
import { useEffect, useRef, useState } from 'react'
import { audioFile, keyFor, type Spoken } from '../content-model/audio.ts'
import type { HeardExample, HeardLine } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { German } from './German.tsx'
import { useProgress } from './progress.ts'

type State = 'idle' | 'playing' | 'failed'

/** The silence between two lines of a recording, in milliseconds, so that one speaker does not run into the next. */
const PAUSE_BETWEEN_LINES = 350

/** The one sound playing on the page, so that pressing another button stops it. */
let playing: { stop: () => void } | null = null

/**
 * Plays pieces of German one after the other, in one audio element (a phone
 * lets a page that the learner touched once play the next file in it).
 */
function useSound(): { state: State; play: (pieces: readonly Spoken[]) => void; stop: () => void } {
  const [state, setState] = useState<State>('idle')
  const { voice } = useProgress()
  const stopRef = useRef<(() => void) | null>(null)

  // A page that is left stops what it plays.
  useEffect(() => () => stopRef.current?.(), [])

  const play = (pieces: readonly Spoken[]) => {
    playing?.stop()
    const sound = new Audio()
    let pause: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    const self = {
      stop: () => {
        stopped = true
        clearTimeout(pause)
        sound.pause()
        if (playing === self) playing = null
        stopRef.current = null
        setState((current) => (current === 'playing' ? 'idle' : current))
      },
    }
    // Stopping a file that is still loading makes it fail; that is no failure to show.
    const fail = () => {
      if (stopped) return
      self.stop()
      setState('failed')
    }
    const playPiece = (index: number) => {
      const piece = pieces[index]
      if (!piece) {
        self.stop()
        return
      }
      sound.src = new URL(`content/${audioFile(keyFor(piece, voice))}`, document.baseURI).href
      sound.play().catch(fail)
    }
    let place = 0
    sound.addEventListener('ended', () => {
      place += 1
      if (place >= pieces.length) self.stop()
      else pause = setTimeout(() => playPiece(place), PAUSE_BETWEEN_LINES)
    })
    sound.addEventListener('error', fail)
    playing = self
    stopRef.current = self.stop
    setState('playing')
    playPiece(0)
  }

  return { state, play, stop: () => stopRef.current?.() }
}

export function PlayButton({ audio }: { audio: Spoken }) {
  const { strings } = useLanguage()
  const { state, play, stop } = useSound()

  const isPlaying = state === 'playing'
  return (
    <>
      <button
        type="button"
        className="play"
        aria-label={isPlaying ? strings.stopListening : strings.listen}
        onClick={isPlaying ? stop : () => play([audio])}
      >
        <PlayIcon playing={isPlaying} />
      </button>
      {state === 'failed' && <PlayFailed />}
    </>
  )
}

interface PlayRecordingProps {
  lines: readonly HeardLine[]
  /**
   * How often the recording may be played, as in the exam (a mock exam's
   * Hören). Each start counts, also one that is stopped; one that fails to
   * play is given back. Unlimited when absent.
   */
  plays?: number
}

/** The recording of a heard text: every line, in order, each in the voice of its speaker. */
export function PlayRecording({ lines, plays }: PlayRecordingProps) {
  const { strings } = useLanguage()
  const { state, play, stop } = useSound()
  const [started, setStarted] = useState(0)

  // A play that failed to start is no play.
  useEffect(() => {
    if (state === 'failed') setStarted((count) => Math.max(0, count - 1))
  }, [state])

  const isPlaying = state === 'playing'
  const left = plays === undefined ? undefined : Math.max(0, plays - started)
  return (
    <p className="recording">
      <button
        type="button"
        className="btn btn-recording"
        disabled={!isPlaying && left === 0}
        onClick={
          isPlaying
            ? stop
            : () => {
                setStarted((count) => count + 1)
                play(lines.map((line) => line.audio))
              }
        }
      >
        <PlayIcon playing={isPlaying} />
        {isPlaying ? strings.stopRecording : strings.playRecording}
      </button>
      {left !== undefined && <span className="secondary plays-left">{strings.playsLeft(left)}</span>}
      {state === 'failed' && <PlayFailed />}
    </p>
  )
}

function PlayIcon({ playing: isPlaying }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {isPlaying ? <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" /> : <path d="M5 2.8v10.4L13.2 8z" />}
    </svg>
  )
}

function PlayFailed() {
  const { strings } = useLanguage()
  return (
    <span role="status" className="play-failed">
      {strings.audioFailed}
    </span>
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

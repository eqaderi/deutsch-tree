import { CHOOSABLE_VOICES } from '../content-model/audio.ts'
import { useLanguage } from '../language/index.tsx'
import { chooseVoice } from '../learning-engine/index.ts'
import { updateProgress, useProgress } from './progress.ts'

/**
 * The voice choice, at the foot of every page: the male or the female voice
 * for everything one person says. A dialogue keeps its speakers' voices. The
 * choice is kept with the progress, so an export carries it.
 */
export function VoiceSwitch() {
  const { strings } = useLanguage()
  const { voice } = useProgress()
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset cannot be laid out as one pill in every browser
    <div role="group" aria-label={strings.voice} className="pill-switch">
      {CHOOSABLE_VOICES.map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={choice === voice}
          onClick={() => updateProgress((progress) => chooseVoice(progress, choice))}
        >
          <span>{strings.voiceNames[choice]}</span>
        </button>
      ))}
    </div>
  )
}

import { use, useState } from 'react'
import { ankiFileName, ankiText } from '../anki-export/index.ts'
import type { VocabularyWord } from '../content-model/index.ts'
import { isVocabulary } from '../content-model/scoring.ts'
import { useLanguage } from '../language/index.tsx'
import { startedVocabulary } from '../learning-engine/index.ts'
import { loadIndex, loadNodes } from './content.ts'
import { download } from './download.ts'
import { useProgress } from './progress.ts'

type Outcome = { step: 'saved'; fileName: string } | { step: 'loading' } | { step: 'failed' }

/**
 * The export to Anki on a vocabulary page: the words of this node, or of
 * every vocabulary node the learner has started, as a file the browser saves.
 * The meaning is in the page's language. The other nodes' files are fetched
 * only when the learner asks for them; nothing is uploaded.
 */
export function AnkiExport({ nodeId, words }: { nodeId: string; words: readonly VocabularyWord[] }) {
  const { language, strings } = useLanguage()
  const started = startedVocabulary(use(loadIndex()).nodes, useProgress())
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  function save(of: string, wordsToSave: readonly VocabularyWord[]) {
    const fileName = ankiFileName(of)
    download({ name: fileName, text: ankiText(wordsToSave, language) }, 'text/plain;charset=utf-8')
    setOutcome({ step: 'saved', fileName })
  }

  async function saveStarted() {
    setOutcome({ step: 'loading' })
    try {
      const nodes = await loadNodes(started.map((node) => node.id))
      save(
        'started',
        nodes.flatMap(({ content }) => (content && isVocabulary(content) ? content.words : [])),
      )
    } catch {
      setOutcome({ step: 'failed' })
    }
  }

  return (
    <section className="panel" aria-labelledby="section-anki">
      <h2 id="section-anki" className="cap">
        {strings.ankiTitle}
      </h2>
      <p>{strings.ankiText}</p>
      <div className="actions">
        <button type="button" className="btn" onClick={() => save(nodeId, words)}>
          {strings.ankiThisTopic}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          disabled={started.length === 0 || outcome?.step === 'loading'}
          aria-describedby="anki-started-note"
          onClick={saveStarted}
        >
          {strings.ankiStartedTopics}
        </button>
      </div>
      <p id="anki-started-note" className="secondary anki-note">
        {started.length === 0 ? strings.ankiNoneStarted : strings.ankiStartedCount(started.length)}
      </p>
      {/* Always there, so that a screen reader hears the words when they arrive. */}
      <div role="status">
        {outcome?.step === 'saved' && (
          <p className="file-note">
            <span>{strings.ankiSavedAs}</span>
            <bdi dir="ltr">{outcome.fileName}</bdi>
          </p>
        )}
        {outcome?.step === 'loading' && <p>{strings.loading}</p>}
        {outcome?.step === 'failed' && <p className="refused">{strings.ankiLoadFailed}</p>}
      </div>
    </section>
  )
}

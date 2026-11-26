import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../language/index.tsx'
import { doneCount, examResultCounts, hasProgress, type Progress } from '../learning-engine/index.ts'
import { exportProgress, importProgress, type ReadProblem } from '../progress-store/index.ts'
import { download } from './download.ts'
import { acknowledgeMilestonesOf } from './milestones.ts'
import { BackToTree } from './NotFound.tsx'
import { PageTitle } from './PageTitle.tsx'
import { progressProblem, updateProgress, useProgress } from './progress.ts'

/** What the page last did, or is waiting for. One thing at a time. */
type Outcome =
  | { step: 'exported'; fileName: string }
  /** A file was read and there is progress here that it would replace. */
  | { step: 'confirm'; progress: Progress; exported: Date | null }
  | { step: 'imported' }
  | { step: 'refused'; problem: ReadProblem }

/**
 * Backup: export the progress to a file, and import it from one, on this
 * device or another. Everything happens in the browser; nothing is uploaded.
 * What a file holds and how old files stay readable is the progress store's
 * business (`src/progress-store/index.ts`).
 */
export function BackupPage() {
  const { strings } = useLanguage()
  const progress = useProgress()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function exportToFile() {
    const file = exportProgress(progress, new Date(), strings.aboutProgressFile(strings.backupLink))
    download(file, 'application/json')
    acknowledgeMilestonesOf(progress)
    setOutcome({ step: 'exported', fileName: file.name })
  }

  async function fileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const read = importProgress(await file.text().catch(() => ''))
    // Empty again, so that choosing the same file a second time is noticed.
    input.value = ''
    if (!read.ok) setOutcome({ step: 'refused', problem: read.problem })
    else if (hasProgress(progress)) setOutcome({ step: 'confirm', progress: read.progress, exported: read.exported })
    else replaceWith(read.progress)
  }

  function replaceWith(imported: Progress) {
    updateProgress(() => imported)
    acknowledgeMilestonesOf(imported)
    setOutcome({ step: 'imported' })
  }

  return (
    <main className="wrap">
      <PageTitle title={strings.backupTitle} />
      <BackToTree />
      <header className="page-head">
        <h1>{strings.backupTitle}</h1>
      </header>

      <section className="panel message">
        <p>{strings.backupWhy}</p>
        {!progressProblem && (
          <dl className="facts">
            <div>
              <dt>{strings.onThisDevice}</dt>
              <dd>
                <ProgressFacts progress={progress} />
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* With progress from a newer version in storage, there is nothing here to export and nowhere to import to. */}
      {!progressProblem && (
        <>
          <section className="panel message" aria-labelledby="export-heading">
            <h2 id="export-heading" className="cap">
              {strings.exportTitle}
            </h2>
            <p>{strings.exportText}</p>
            <button type="button" className="btn btn-main" onClick={exportToFile}>
              {strings.exportProgress}
            </button>
            {outcome?.step === 'exported' && (
              <p role="status" className="file-note">
                <span>{strings.exportedAs}</span>
                <bdi dir="ltr">{outcome.fileName}</bdi>
                <span>{strings.keepFileSafe}</span>
              </p>
            )}
          </section>

          <section className="panel message" aria-labelledby="import-heading">
            <h2 id="import-heading" className="cap">
              {strings.importTitle}
            </h2>
            <p>{strings.importText}</p>
            <button type="button" className="btn btn-quiet" onClick={() => fileInput.current?.click()}>
              {strings.importFile}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              tabIndex={-1}
              onChange={fileChosen}
            />
            {outcome?.step === 'confirm' && (
              <ReplaceWarning
                here={progress}
                inFile={outcome.progress}
                exported={outcome.exported}
                onReplace={() => replaceWith(outcome.progress)}
                onCancel={() => setOutcome(null)}
              />
            )}
            {outcome?.step === 'imported' && <p role="status">{strings.imported}</p>}
            {outcome?.step === 'refused' && (
              <p role="alert" className="refused">
                {outcome.problem === 'newer-version' ? strings.importNewerVersion : strings.importNotProgress}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}

interface ReplaceWarningProps {
  here: Progress
  inFile: Progress
  exported: Date | null
  onReplace: () => void
  onCancel: () => void
}

/** Shown before an import replaces progress: what is here, what the file holds, and a yes or no. */
function ReplaceWarning({ here, inFile, exported, onReplace, onCancel }: ReplaceWarningProps) {
  const { strings } = useLanguage()

  // The safe answer gets the keyboard.
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => cancel.current?.focus(), [])

  return (
    <div role="alertdialog" className="replace" aria-labelledby="replace-heading" aria-describedby="replace-text">
      <h3 id="replace-heading">{strings.importReplaceTitle}</h3>
      <dl className="facts">
        <div>
          <dt>{strings.onThisDevice}</dt>
          <dd>
            <ProgressFacts progress={here} />
          </dd>
        </div>
        <div>
          <dt>{strings.inTheFile}</dt>
          <dd>
            <ProgressFacts progress={inFile} />
            {exported && <small>{strings.exportedOn(strings.date(exported))}</small>}
          </dd>
        </div>
      </dl>
      <p id="replace-text">{strings.importReplaceText}</p>
      <div className="actions">
        <button type="button" className="btn" onClick={onReplace}>
          {strings.replaceProgress}
        </button>
        <button type="button" className="btn btn-quiet" ref={cancel} onClick={onCancel}>
          {strings.cancel}
        </button>
      </div>
    </div>
  )
}

/** What a progress holds, in a few words: the topics done, and the exam results when there are any. */
function ProgressFacts({ progress }: { progress: Progress }) {
  const { strings } = useLanguage()
  const { mockModules, officialExams } = examResultCounts(progress)
  return (
    <>
      {strings.topicsDone(doneCount(progress))}
      {mockModules > 0 && <small>{strings.mockModulesFinished(mockModules)}</small>}
      {officialExams > 0 && <small>{strings.officialExamsScored(officialExams)}</small>}
    </>
  )
}

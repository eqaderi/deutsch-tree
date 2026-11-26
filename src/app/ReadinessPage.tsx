import { type FormEvent, use, useEffect, useId, useRef, useState } from 'react'
import type { OfficialExamLink, OfficialMockExam } from '../content-model/index.ts'
import { allStrings, useLanguage } from '../language/index.tsx'
import {
  EXAM_MODULES,
  type ExamModule,
  examStanding,
  MAXIMUM_SCORE,
  type ModuleScores,
  officialExamScores,
  type Progress,
  READINESS_SCORE,
  type Readiness,
  readinessOf,
  readScore,
  recordOfficialExamScores,
} from '../learning-engine/index.ts'
import { loadOfficialMockExams } from './content.ts'
import { German, RichText } from './German.tsx'
import { BackToTree } from './NotFound.tsx'
import { PageTitle } from './PageTitle.tsx'
import { updateProgress, useProgress } from './progress.ts'

/**
 * The readiness view: whether the learner can book the exam and what is
 * missing, the warning to keep the official mock exams unseen, and the exams
 * themselves, each with its recorded scores and its links.
 *
 * The app only links to the exams. A link is an ordinary link that the
 * learner follows; the app requests nothing from another site.
 */
export function ReadinessPage() {
  const { strings } = useLanguage()
  const { exams } = use(loadOfficialMockExams())
  const progress = useProgress()
  const adults = exams.filter((exam) => exam.audience === 'adults')
  const spares = exams.filter((exam) => exam.audience !== 'adults')

  return (
    <main className="wrap">
      <PageTitle title={strings.readinessTitle} />
      <BackToTree />
      <header className="page-head">
        <h1>{strings.readinessTitle}</h1>
      </header>

      <Verdict result={readinessOf(progress, exams)} exams={exams} />
      <KeepUnseen />

      <section aria-labelledby="official-exams-heading">
        <h2 id="official-exams-heading" className="list-heading">
          {strings.officialMockExams}
        </h2>
        <p className="list-intro">{strings.officialMockExamsIntro}</p>
        {adults.map((exam) => (
          <ExamCard key={exam.id} exam={exam} progress={progress} />
        ))}
      </section>

      {spares.length > 0 && (
        <section aria-labelledby="spare-sets-heading">
          <h2 id="spare-sets-heading" className="list-heading">
            {strings.spareSets}
          </h2>
          <p className="list-intro">{strings.spareSetsIntro}</p>
          {spares.map((exam) => (
            <ExamCard key={exam.id} exam={exam} progress={progress} />
          ))}
        </section>
      )}
    </main>
  )
}

/** The plain statement: ready or not, how many exams reached the target, and what is missing. */
function Verdict({ result, exams }: { result: Readiness; exams: readonly OfficialMockExam[] }) {
  const { strings } = useLanguage()
  const unfinished = result.exams.filter((exam) => exam.started && !exam.met)

  return (
    <section className="panel verdict" aria-labelledby="readiness-heading">
      <h2 id="readiness-heading" className="cap">
        {strings.readiness}
      </h2>
      <div aria-live="polite">
        <h3 className="verdict-word">{result.ready ? strings.ready : strings.notReady}</h3>
        <p className="score">
          <span className="big-number">{strings.number(Math.min(result.met, result.needed))}</span>{' '}
          <span className="secondary">{strings.ofExamsAtTarget(result.needed, READINESS_SCORE)}</span>
        </p>
        <p>
          {result.ready
            ? strings.readyText(READINESS_SCORE, result.needed)
            : strings.readinessRule(READINESS_SCORE, result.needed)}
        </p>
      </div>

      {!result.ready && (
        <>
          <h3 id="missing-heading" className="cap">
            {strings.whatIsMissing}
          </h3>
          <ul className="missing" aria-labelledby="missing-heading">
            <li>{strings.examsStillNeeded(result.missing, READINESS_SCORE)}</li>
            {unfinished.map((exam) => (
              <li key={exam.id}>
                <German>{exams.find((candidate) => candidate.id === exam.id)?.title}</German>
                <span>
                  {[
                    ...exam.below.map(({ module, score }) =>
                      strings.moduleBelow(strings.examModules[module], score, READINESS_SCORE),
                    ),
                    ...exam.notRecorded.map((module) => strings.moduleNotRecorded(strings.examModules[module])),
                  ].join(' ')}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** The warning. It stands above every exam, in words, and is not styled away. */
function KeepUnseen() {
  const { strings } = useLanguage()
  return (
    <section className="panel warning" aria-labelledby="keep-unseen-heading">
      <h2 id="keep-unseen-heading">{strings.keepUnseenTitle}</h2>
      <p>{strings.keepUnseenText}</p>
      <p>{strings.keepUnseenThen}</p>
    </section>
  )
}

/** A module's name, with the German name the exam papers print beside it. */
export function ModuleName({ module }: { module: ExamModule }) {
  const { language, strings } = useLanguage()
  if (language === 'de') return strings.examModules[module]
  return (
    <>
      {strings.examModules[module]} <German className="module-german">{allStrings.de.examModules[module]}</German>
    </>
  )
}

/** One official mock exam: its recorded scores, how it stands, and the way to its links. */
function ExamCard({ exam, progress }: { exam: OfficialMockExam; progress: Progress }) {
  const { strings } = useLanguage()
  const headingId = useId()
  const [editing, setEditing] = useState(false)
  const scores = officialExamScores(progress, exam.id)
  const standing = examStanding(progress, exam.id)

  // After the score fields close, the keyboard goes back to the button that opened them.
  const editButton = useRef<HTMLButtonElement>(null)
  const closed = useRef(false)
  useEffect(() => {
    if (!editing && closed.current) editButton.current?.focus()
  }, [editing])
  const close = () => {
    closed.current = true
    setEditing(false)
  }

  return (
    <section className="panel exam" aria-labelledby={headingId}>
      <h3 id={headingId} className="exam-title">
        <German>{exam.title}</German>
      </h3>
      <div className="meta">
        <span className="tag">{strings.examAudiences[exam.audience]}</span>
        <German className="secondary">{exam.publisher}</German>
      </div>
      {!exam.countsTowardReadiness && <p className="exam-note">{strings.doesNotCount}</p>}
      {exam.countsTowardReadiness && exam.audience !== 'adults' && <p className="exam-note">{strings.spareCounts}</p>}

      <dl className="module-scores">
        {EXAM_MODULES.map((module) => {
          const score = scores[module]
          return (
            <div key={module}>
              <dt>
                <ModuleName module={module} />
              </dt>
              {score === undefined ? (
                <dd className="score-none">{strings.scoreNotRecorded}</dd>
              ) : (
                <dd className="big-number">{strings.number(score)}</dd>
              )}
            </div>
          )
        })}
      </dl>

      <p className="exam-state">
        <span className={standing.met ? 'mark mark-done' : 'mark'} aria-hidden="true" />
        {standing.met
          ? strings.examAtTarget(READINESS_SCORE)
          : standing.started
            ? strings.examBelowTarget
            : strings.examNotRecorded}
      </p>

      {editing ? (
        <ScoreForm examId={exam.id} scores={scores} onDone={close} />
      ) : (
        <button type="button" className="btn" ref={editButton} onClick={() => setEditing(true)}>
          {standing.started ? strings.changeScores : strings.recordScores}
        </button>
      )}

      <ExamLinks links={exam.links} seen={standing.started} />
    </section>
  )
}

/**
 * The four score fields of one exam. Nothing is saved until every field is
 * either empty or a score; the learning engine says what a score is.
 */
function ScoreForm({ examId, scores, onDone }: { examId: string; scores: ModuleScores; onDone: () => void }) {
  const { strings } = useLanguage()
  const hintId = useId()
  const [typed, setTyped] = useState<Record<ExamModule, string>>(() => {
    const shown = (module: ExamModule) => (scores[module] === undefined ? '' : strings.number(scores[module]))
    return {
      reading: shown('reading'),
      listening: shown('listening'),
      writing: shown('writing'),
      speaking: shown('speaking'),
    }
  })
  const [invalid, setInvalid] = useState<ExamModule[]>([])

  const save = (event: FormEvent) => {
    event.preventDefault()
    const read: ModuleScores = {}
    const refused: ExamModule[] = []
    for (const module of EXAM_MODULES) {
      const score = readScore(typed[module])
      if (score === 'invalid') refused.push(module)
      else if (score !== 'none') read[module] = score
    }
    setInvalid(refused)
    if (refused.length > 0) return
    updateProgress((progress) => recordOfficialExamScores(progress, examId, read))
    onDone()
  }

  return (
    <form className="score-form" onSubmit={save} noValidate>
      <p id={hintId} className="score-hint">
        {strings.scoreHint(MAXIMUM_SCORE)}
      </p>
      <div className="score-fields">
        {EXAM_MODULES.map((module, index) => (
          <label key={module} className="score-field">
            <span>
              <ModuleName module={module} />
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              // The fields open on a tap of "Record scores": the keyboard goes to the first of them.
              // biome-ignore lint/a11y/noAutofocus: the learner asked for these fields a moment ago.
              autoFocus={index === 0}
              value={typed[module]}
              onChange={(event) => setTyped({ ...typed, [module]: event.target.value })}
              aria-describedby={hintId}
              aria-invalid={invalid.includes(module) ? true : undefined}
            />
          </label>
        ))}
      </div>
      {invalid.length > 0 && (
        <p role="alert" className="form-error">
          {strings.scoreInvalid(MAXIMUM_SCORE)}
        </p>
      )}
      <div className="result-actions">
        <button type="submit" className="btn btn-main">
          {strings.saveScores}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          {strings.cancel}
        </button>
      </div>
    </form>
  )
}

/**
 * The links of one exam. They are not on the page until the learner asks for
 * them, and for an exam with no score yet the app first asks back whether
 * this is the final check: the warning cannot be scrolled past on the way to
 * a link. An exam with a score has been seen already, so it is not asked.
 */
function ExamLinks({ links, seen }: { links: OfficialExamLink[]; seen: boolean }) {
  const { strings } = useLanguage()
  const questionId = useId()
  const [state, setState] = useState<'closed' | 'asking' | 'open'>('closed')

  // Each step replaces the button that led to it: the keyboard follows to the new one.
  const focusTarget = useRef<HTMLButtonElement>(null)
  const moved = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the step changes, which is what moves the button.
  useEffect(() => {
    if (moved.current) focusTarget.current?.focus()
  }, [state])
  const go = (next: typeof state) => {
    moved.current = true
    setState(next)
  }

  if (state === 'closed') {
    return (
      <div className="exam-links-area">
        <button
          type="button"
          className="btn btn-quiet"
          ref={focusTarget}
          aria-expanded="false"
          onClick={() => go(seen ? 'open' : 'asking')}
        >
          {strings.showExamLinks}
        </button>
      </div>
    )
  }

  if (state === 'asking') {
    return (
      // biome-ignore lint/a11y/useSemanticElements: a question with its two answers; a fieldset is for form fields.
      <div className="exam-links-area final-check" role="group" aria-labelledby={questionId}>
        <p id={questionId} className="final-check-question">
          {strings.finalCheckQuestion}
        </p>
        <p>{strings.finalCheckText}</p>
        <div className="result-actions">
          {/* "Not yet" comes first and takes the keyboard: the careful answer is the easy one. */}
          <button type="button" className="btn" ref={focusTarget} onClick={() => go('closed')}>
            {strings.finalCheckNotYet}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => go('open')}>
            {strings.finalCheckYes}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="exam-links-area">
      <button
        type="button"
        className="btn btn-quiet"
        ref={focusTarget}
        aria-expanded="true"
        onClick={() => go('closed')}
      >
        {strings.hideExamLinks}
      </button>
      <ul className="exam-links">
        {links.map((link) => (
          <ExamLink key={`${link.kind} ${link.url}`} link={link} />
        ))}
      </ul>
    </div>
  )
}

function ExamLink({ link }: { link: OfficialExamLink }) {
  const { language, strings } = useLanguage()
  return (
    <li className="exam-link">
      <a href={link.url} target="_blank" rel="noopener noreferrer">
        {strings.examLinkKinds[link.kind]}
        <German className="exam-link-site">{siteOf(link.url)}</German>
      </a>
      {link.candidatePages && (
        <p className="exam-link-pages">
          {strings.candidatePagesOnly(link.candidatePages.first, link.candidatePages.last)}
        </p>
      )}
      {link.note && (
        <p>
          <RichText parts={link.note[language]} />
        </p>
      )}
    </li>
  )
}

/** The site a link leads to, such as "goethe.de", so the learner sees where they are going. */
function siteOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '')
}

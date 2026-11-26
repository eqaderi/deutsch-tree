/**
 * One module of an original mock exam, as it is taken
 * (`#/mock-exams/<exam>/<module>`): first what it holds and the choice of the
 * time limit, then the module with its clock, then the result, which joins
 * the history.
 *
 * The page is a shell around the module. The shell owns what every module
 * has: the start, the clock, finishing (by the learner or when time is up),
 * the score out of 100 against 60 and 90, and the history. What the learner
 * does inside a module is `ModuleRun`, chosen by the module's `scoredBy`:
 * `ItemModuleRun` for Lesen and Hören, scored per item, and
 * `AssistantModuleRun` for Schreiben and Sprechen, graded by an AI assistant,
 * which calls `onFinish` with the points of its parts.
 */
import { type ReactNode, type RefObject, use, useEffect, useId, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { modulePoints } from '../assistant-grading/index.ts'
import type {
  AssistantTaskModule,
  AssistantTaskPart,
  ItemTaskModule,
  MockExam,
  MockExamModule,
} from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import {
  type Answer,
  type AttemptResult,
  examModuleOf,
  isAnswered,
  MAXIMUM_SCORE,
  type MockModuleResult,
  type MockPartResult,
  mockModuleResult,
  recordMockExamResult,
  scoreAttempt,
  taskAsAsked,
  timeLeft,
} from '../learning-engine/index.ts'
import { GradingSteps, ScoreEntry, TaskSheetView } from './AssistantGrading.tsx'
import { loadMockExam, loadMockExams } from './content.ts'
import { RichText } from './German.tsx'
import { ItemResults, TaskItems, TaskTexts } from './ItemTaskView.tsx'
import { MockResultSummary, moduleFacts } from './MockExamsPage.tsx'
import { NotFound } from './NotFound.tsx'
import { BackLink, PageTitle } from './PageTitle.tsx'
import { updateProgress } from './progress.ts'
import { ModuleName } from './ReadinessPage.tsx'

export function MockExamPage() {
  const params = useParams()
  const { exams } = use(loadMockExams())
  // Only a published exam lists its modules.
  const listed = exams.find((exam) => exam.id === params.exam && exam.modules.some((one) => one === params.module))
  if (!listed) return <NotFound />
  return <ModulePage key={`${listed.id}/${params.module}`} examId={listed.id} moduleName={params.module ?? ''} />
}

function ModulePage({ examId, moduleName }: { examId: string; moduleName: string }) {
  const exam = use(loadMockExam(examId))
  const module = exam.content?.modules.find((candidate) => candidate.module === moduleName)
  if (!module) return <NotFound />
  return <MockExamModuleShell exam={exam} module={module} />
}

/** What a module's run hands back when it is finished. */
export interface FinishedModule {
  /** Every part, in order, with its right items (or points) and its total. */
  parts: MockPartResult[]
  /** Shown below the result: what was answered, part by part. */
  details: ReactNode
}

/** What the shell gives the run of any module. */
export interface ModuleRunProps<Module extends MockExamModule> {
  exam: MockExam
  module: Module
  /**
   * The time is up. Lesen and Hören finish at once with what was answered;
   * Schreiben and Sprechen stop the writing or speaking, and the learner
   * still enters the scores the assistant gives.
   */
  timeUp: boolean
  /** Called once, when the module is finished. */
  onFinish: (finished: FinishedModule) => void
}

type Phase =
  | { at: 'start' }
  | { at: 'running'; timed: boolean; startedAt: number; timeUp: boolean }
  | { at: 'finished'; result: MockModuleResult; details: ReactNode; timeUp: boolean }

function MockExamModuleShell({ exam, module }: { exam: MockExam; module: MockExamModule }) {
  const { language, strings } = useLanguage()
  const [phase, setPhase] = useState<Phase>({ at: 'start' })
  const [timed, setTimed] = useState(true)
  const examModule = examModuleOf(module.module)

  const finish = ({ parts, details }: FinishedModule) => {
    if (phase.at !== 'running') return
    const result = mockModuleResult({
      exam: exam.id,
      module: examModule,
      finished: new Date().toISOString(),
      timed: phase.timed,
      parts,
    })
    updateProgress((before) => recordMockExamResult(before, result))
    setPhase({ at: 'finished', result, details, timeUp: phase.timeUp })
  }

  return (
    <main className="wrap">
      <PageTitle title={strings.mockExamsTitle} />
      <BackLink to="/mock-exams">{strings.allMockExams}</BackLink>
      <header className="page-head">
        <p className="secondary">
          <RichText parts={exam.title[language]} />
        </p>
        <h1>
          <ModuleName module={examModule} />
        </h1>
      </header>

      {phase.at === 'start' && (
        <ModuleStart
          module={module}
          timed={timed}
          onTimed={setTimed}
          onStart={() => setPhase({ at: 'running', timed, startedAt: Date.now(), timeUp: false })}
        />
      )}
      {phase.at === 'running' && (
        <>
          {phase.timed && (
            <ModuleClock
              minutes={module.minutes}
              startedAt={phase.startedAt}
              onTimeUp={() => setPhase({ ...phase, timeUp: true })}
              onSwitchOff={() => setPhase({ ...phase, timed: false })}
            />
          )}
          <ModuleRun exam={exam} module={module} timeUp={phase.timeUp} onFinish={finish} />
        </>
      )}
      {phase.at === 'finished' && (
        <ModuleResult
          result={phase.result}
          // Only a module scored per item was finished by the clock.
          timeUp={phase.timeUp && module.scoredBy === 'items'}
          details={phase.details}
          onAgain={() => setPhase({ at: 'start' })}
        />
      )}
    </main>
  )
}

/** The run of a module, by how the module is scored. */
function ModuleRun(props: ModuleRunProps<MockExamModule>) {
  switch (props.module.scoredBy) {
    case 'items':
      return <ItemModuleRun {...props} module={props.module} />
    case 'assistant':
      return <AssistantModuleRun {...props} module={props.module} />
  }
}

interface ModuleStartProps {
  module: MockExamModule
  timed: boolean
  onTimed: (timed: boolean) => void
  onStart: () => void
}

/** Before a module: what it holds, the time limit to switch on or off, and the start. */
function ModuleStart({ module, timed, onTimed, onStart }: ModuleStartProps) {
  const { strings } = useLanguage()
  const id = useId()
  const graded = module.scoredBy === 'assistant'
  const heard = !graded && module.parts.some((part) => part.plays !== undefined)
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {moduleFacts(module, strings)}
      </h2>
      <label className="check">
        <input type="checkbox" checked={timed} onChange={(event) => onTimed(event.target.checked)} />
        <span>{strings.useTimeLimit(module.minutes)}</span>
      </label>
      <p className="secondary">
        {timed ? (graded ? strings.gradedTimeLimitNote : strings.timeLimitNote) : strings.noTimeLimit}
      </p>
      {heard && <p className="secondary">{strings.playsNote}</p>}
      <div className="result-actions">
        <button type="button" className="btn btn-main" onClick={onStart}>
          {strings.startTheModule}
        </button>
      </div>
    </section>
  )
}

interface ModuleClockProps {
  minutes: number
  startedAt: number
  onTimeUp: () => void
  onSwitchOff: () => void
}

/** The time left while a module runs with its time limit, and the way to switch it off. */
function ModuleClock({ minutes, startedAt, onTimeUp, onSwitchOff }: ModuleClockProps) {
  const { strings } = useLanguage()
  const [left, setLeft] = useState(() => timeLeft(minutes, startedAt, Date.now()))
  const timeUp = useRef(onTimeUp)
  timeUp.current = onTimeUp

  useEffect(() => {
    const tick = () => {
      const now = timeLeft(minutes, startedAt, Date.now())
      setLeft(now)
      if (now === 0) {
        clearInterval(timer)
        timeUp.current()
      }
    }
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [minutes, startedAt])

  return (
    <div className="mock-clock">
      <p>
        <span className="secondary">{strings.timeLeft}</span> {/* Minutes before seconds in every language. */}
        <span role="timer" className="mock-clock-time" dir="ltr">
          {strings.clock(Math.floor(left / 60), left % 60)}
        </span>
      </p>
      <button type="button" className="btn btn-quiet" onClick={onSwitchOff}>
        {strings.switchTimerOff}
      </button>
    </div>
  )
}

interface ModuleResultProps {
  result: MockModuleResult
  timeUp: boolean
  details: ReactNode
  onAgain: () => void
}

/** A finished module: its score against 60 and 90, each part, and what was answered. */
function ModuleResult({ result, timeUp, details, onAgain }: ModuleResultProps) {
  const { strings } = useLanguage()
  const heading = useRef<HTMLDivElement>(null)
  // The result takes the place of the module: take the keyboard and a screen reader to it.
  useEffect(() => heading.current?.focus(), [])
  return (
    <>
      <section
        className="panel result mock-result"
        aria-label={strings.moduleResult(strings.examModules[result.module])}
      >
        <div ref={heading} tabIndex={-1}>
          <MockResultSummary result={result} heading />
        </div>
        {timeUp && <p className="message">{strings.timeIsUp}</p>}
        <div className="result-actions">
          <Link to="/mock-exams" className="btn btn-main">
            {strings.allMockExams}
          </Link>
          <button type="button" className="btn btn-quiet" onClick={onAgain}>
            {strings.takeAgain}
          </button>
        </div>
      </section>
      {details}
    </>
  )
}

/**
 * Lesen or Hören: the parts one at a time, chosen from a row of parts, each
 * with its texts (or recordings) and items, numbered across the module as
 * the exam numbers them. Every part stays on the page while it is hidden,
 * so its answers and the plays of its recordings are kept. Each run asks
 * the tasks as an attempt asks them, so the options stand in an order of
 * their own.
 */
function ItemModuleRun({ exam, module: written, timeUp, onFinish }: ModuleRunProps<ItemTaskModule>) {
  const { strings } = useLanguage()
  const [module] = useState(() => ({
    ...written,
    parts: written.parts.map((part) => ({ ...part, task: taskAsAsked(part.task, Math.random) })),
  }))
  const { place, show, top } = usePartPlace()
  const [answers, setAnswers] = useState<Array<Array<Answer | undefined>>>(() => module.parts.map(() => []))
  const firstNumbers = module.parts.map((_, index) =>
    module.parts.slice(0, index).reduce((sum, part) => sum + part.task.items.length, 1),
  )
  const total = module.parts.reduce((sum, part) => sum + part.task.items.length, 0)
  const answered = module.parts.reduce(
    (sum, part, index) =>
      sum + part.task.items.filter((item, itemIndex) => isAnswered(item, answers[index]?.[itemIndex])).length,
    0,
  )

  const finish = () => {
    const results = module.parts.map((part, index) => scoreAttempt(part.task.items, answers[index] ?? []))
    onFinish({
      parts: module.parts.map((part, index) => ({
        part: part.part,
        correct: results[index]?.correct ?? 0,
        total: part.task.items.length,
      })),
      details: <ItemModuleAnswers exam={exam} module={module} results={results} firstNumbers={firstNumbers} />,
    })
  }
  const finishNow = useRef(finish)
  finishNow.current = finish
  useEffect(() => {
    if (timeUp) finishNow.current()
  }, [timeUp])

  return (
    <>
      <PartChoice parts={module.parts} place={place} onShow={show} navRef={top} />

      {module.parts.map((part, index) => (
        <div key={part.part} hidden={index !== place}>
          <h2 className="list-heading">{strings.packPart(part.part)}</h2>
          <TaskTexts task={part.task} plays={part.plays} />
          <TaskItems
            reportAs={exam.id}
            task={part.task}
            answers={answers[index] ?? []}
            firstNumber={firstNumbers[index]}
            onAnswer={(itemIndex, given) =>
              setAnswers((before) =>
                before.map((partAnswers, partIndex) =>
                  partIndex === index ? Object.assign([...partAnswers], { [itemIndex]: given }) : partAnswers,
                ),
              )
            }
          />
        </div>
      ))}

      <ModuleActions
        hasNext={place < module.parts.length - 1}
        onNext={() => show(place + 1)}
        onFinish={finish}
        note={strings.answeredOf(answered, total)}
      />
    </>
  )
}

interface ItemModuleAnswersProps {
  exam: MockExam
  module: ItemTaskModule
  results: AttemptResult[]
  firstNumbers: number[]
}

/** Every part of a finished Lesen or Hören, folded: its texts (what was said, for Hören) and every item. */
function ItemModuleAnswers({ exam, module, results, firstNumbers }: ItemModuleAnswersProps) {
  const { strings } = useLanguage()
  return (
    <>
      {module.parts.map((part, index) => {
        const result = results[index]
        if (!result) return null
        return (
          <details key={part.part} className="panel mock-part-answers">
            <summary>
              {strings.partAnswers(part.part)} · {strings.partRight(result.correct, result.total)}
            </summary>
            <TaskTexts task={part.task} checked />
            <ItemResults reportAs={exam.id} task={part.task} result={result} firstNumber={firstNumbers[index]} />
          </details>
        )
      })}
    </>
  )
}

/**
 * Schreiben or Sprechen: the tasks one at a time, chosen from the same row
 * of parts, each with its task sheet, the prompt to have it graded by an AI
 * assistant, and the box for the score that comes back. The learner
 * finishes the module, also after the time is up, and each task's score
 * becomes points of its weight (`modulePoints`); a task without a score
 * counts as 0.
 */
function AssistantModuleRun({ module, timeUp, onFinish }: ModuleRunProps<AssistantTaskModule>) {
  const { strings } = useLanguage()
  const { place, show, top } = usePartPlace()
  const [scores, setScores] = useState<Array<number | undefined>>(() => module.parts.map(() => undefined))
  const entered = scores.filter((score) => score !== undefined).length

  const finish = () =>
    onFinish({
      parts: modulePoints(module.module, scores),
      details: <EnteredScores module={module} scores={scores} />,
    })

  return (
    <>
      <PartChoice parts={module.parts} place={place} onShow={show} navRef={top} />
      {timeUp && <p className="message">{strings.gradedTimeIsUp}</p>}

      {module.parts.map((part, index) => (
        <div key={part.part} hidden={index !== place}>
          <h2 className="list-heading">{strings.packPart(part.part)}</h2>
          <AssistantPart
            part={part}
            score={scores[index]}
            onScore={(score) =>
              setScores((before) => before.map((one, partIndex) => (partIndex === index ? score : one)))
            }
          />
        </div>
      ))}

      <ModuleActions
        hasNext={place < module.parts.length - 1}
        onNext={() => show(place + 1)}
        onFinish={finish}
        note={strings.scoresEnteredOf(entered, module.parts.length)}
      />
    </>
  )
}

interface AssistantPartProps {
  part: AssistantTaskPart
  score: number | undefined
  onScore: (score: number) => void
}

/** One task of Schreiben or Sprechen: the task, how to have it graded, and its score. A new score replaces the last. */
function AssistantPart({ part, score, onScore }: AssistantPartProps) {
  const { strings } = useLanguage()
  const id = useId()
  return (
    <>
      <section className="panel" aria-labelledby={`${id}-task`}>
        <h3 id={`${id}-task`} className="cap">
          {strings.task}
        </h3>
        <TaskSheetView task={part.task} />
      </section>
      <section className="panel" aria-labelledby={`${id}-prompt`}>
        <h3 id={`${id}-prompt`} className="cap">
          {strings.getYourScore}
        </h3>
        <GradingSteps task={part.task} />
      </section>
      <section className="panel" aria-labelledby={`${id}-score`}>
        <h3 id={`${id}-score`} className="cap">
          {strings.yourScore}
        </h3>
        <p className="score" role="status">
          {score === undefined ? strings.noScoreYet : strings.scoreEntered(score)}
        </p>
        <ScoreEntry onScore={onScore} />
      </section>
    </>
  )
}

/** Below the result of Schreiben or Sprechen: the score out of 100 that was typed in for each task. */
function EnteredScores({ module, scores }: { module: AssistantTaskModule; scores: Array<number | undefined> }) {
  const { strings } = useLanguage()
  const id = useId()
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {strings.enteredScores}
      </h2>
      <dl className="module-scores part-scores">
        {module.parts.map((part, index) => {
          const score = scores[index]
          return (
            <div key={part.part}>
              <dt>{strings.packPart(part.part)}</dt>
              <dd>{score === undefined ? strings.noScoreYet : strings.partRight(score, MAXIMUM_SCORE)}</dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}

/** Which part of a module is shown, and the way to show another, from the top of the row of parts. */
function usePartPlace() {
  const [place, setPlace] = useState(0)
  const top = useRef<HTMLElement>(null)
  const show = (index: number) => {
    setPlace(index)
    top.current?.scrollIntoView({ block: 'start' })
  }
  return { place, show, top }
}

interface PartChoiceProps {
  parts: ReadonlyArray<{ part: number }>
  place: number
  onShow: (index: number) => void
  navRef: RefObject<HTMLElement | null>
}

/** The row of a module's parts, the one shown marked. */
function PartChoice({ parts, place, onShow, navRef }: PartChoiceProps) {
  const { strings } = useLanguage()
  return (
    <nav className="part-choice" aria-label={strings.parts} ref={navRef}>
      {parts.map((part, index) => (
        <button
          key={part.part}
          type="button"
          className="pill"
          aria-current={index === place ? 'step' : undefined}
          onClick={() => onShow(index)}
        >
          {strings.packPart(part.part)}
        </button>
      ))}
    </nav>
  )
}

interface ModuleActionsProps {
  hasNext: boolean
  onNext: () => void
  onFinish: () => void
  /** Under the finish button: how much of the module is done. */
  note: string
}

/** Below the parts: the way to the next part, and the way to finish the module. */
function ModuleActions({ hasNext, onNext, onFinish, note }: ModuleActionsProps) {
  const { strings } = useLanguage()
  return (
    <div className="action-bar">
      {hasNext && (
        <button type="button" className="btn" onClick={onNext}>
          {strings.nextPart}
        </button>
      )}
      <button type="button" className="btn btn-main btn-with-note" onClick={onFinish}>
        {strings.finishModule}
        <small>{note}</small>
      </button>
    </div>
  )
}

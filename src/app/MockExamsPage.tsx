import { use, useId } from 'react'
import { Link } from 'react-router'
import type { MockExamSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import {
  examModuleOf,
  MAXIMUM_SCORE,
  type MockModuleResult,
  mockExamHistory,
  PASS_SCORE,
  READINESS_SCORE,
  scoreStanding,
} from '../learning-engine/index.ts'
import { loadMockExam, loadMockExams } from './content.ts'
import { RichText } from './German.tsx'
import { BackToTree } from './NotFound.tsx'
import { useProgress } from './progress.ts'
import { ModuleName } from './ReadinessPage.tsx'

/**
 * The original mock exams (`#/mock-exams`): each exam with its modules, the
 * way into each, and every result the learner had in it, the latest first.
 * The list file holds no parts; an exam's own file is fetched for the number
 * of questions of its modules.
 */
export function MockExamsPage() {
  const { strings } = useLanguage()
  const { exams } = use(loadMockExams())

  return (
    <main className="wrap">
      <title>{`${strings.mockExamsTitle} · ${strings.appName}`}</title>
      <BackToTree />
      <header className="page-head">
        <h1>{strings.mockExamsTitle}</h1>
        <p className="secondary">{strings.mockExamsIntro}</p>
      </header>
      {exams.map((exam) =>
        exam.status === 'published' ? (
          <MockExamCard key={exam.id} exam={exam} />
        ) : (
          <ComingSoonCard key={exam.id} exam={exam} />
        ),
      )}
    </main>
  )
}

/** A mock exam that is still being written: its title, marked as coming soon. */
function ComingSoonCard({ exam }: { exam: MockExamSummary }) {
  const { language, strings } = useLanguage()
  const headingId = useId()
  return (
    <section className="panel exam" aria-labelledby={headingId}>
      <h2 id={headingId} className="exam-title">
        <RichText parts={exam.title[language]} />
      </h2>
      <p className="meta">
        <span className="tag">{strings.comingSoon}</span>
      </p>
    </section>
  )
}

/** One published mock exam: a row for each module, and its history. */
function MockExamCard({ exam }: { exam: MockExamSummary }) {
  const { language, strings } = useLanguage()
  const headingId = useId()
  const content = use(loadMockExam(exam.id)).content
  const history = mockExamHistory(useProgress(), exam.id)

  return (
    <section className="panel exam" aria-labelledby={headingId}>
      <h2 id={headingId} className="exam-title">
        <RichText parts={exam.title[language]} />
      </h2>
      <ul className="mock-modules">
        {(content?.modules ?? []).map((module) => {
          const items = module.parts.reduce((sum, part) => sum + part.task.items.length, 0)
          const latest = history.find((result) => result.module === examModuleOf(module.module))
          return (
            <li key={module.module}>
              <Link to={`/mock-exams/${exam.id}/${module.module}`} className="row">
                <span className={latest ? 'mark mark-done' : 'mark'} aria-hidden="true" />
                <span className="row-text">
                  <span className="row-title">
                    <ModuleName module={examModuleOf(module.module)} />
                  </span>
                  <span className="row-meta">
                    {strings.moduleFacts(items, module.minutes)}
                    {latest && ` · ${strings.latestScore(latest.score)}`}
                  </span>
                </span>
                <span className="pill">{latest ? strings.takeAgain : strings.startModule}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <MockExamHistory results={history} />
    </section>
  )
}

/** The finished modules of one exam, the latest first: when, the score out of 100, and each part. */
function MockExamHistory({ results }: { results: readonly MockModuleResult[] }) {
  const { strings } = useLanguage()
  const id = useId()
  return (
    <>
      <h3 id={id} className="cap">
        {strings.mockExamHistory}
      </h3>
      {results.length === 0 ? (
        <p className="secondary">{strings.noResultsYet}</p>
      ) : (
        <ol className="mock-history" aria-labelledby={id}>
          {results.map((result) => (
            <li key={`${result.module} ${result.finished}`} className="mock-history-entry">
              <MockResultSummary result={result} />
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

/**
 * A finished module as the history and the result of a module show it: the
 * score out of 100 against the pass mark and the target, and the right items
 * of each part.
 */
export function MockResultSummary({ result, heading }: { result: MockModuleResult; heading?: boolean }) {
  const { strings } = useLanguage()
  const standing = scoreStanding(result.score)
  const Title = heading ? 'h2' : 'p'
  return (
    <>
      <Title className="mock-result-head">
        <ModuleName module={result.module} />
        <span className="secondary">
          {' · '}
          {strings.date(new Date(result.finished))} · {result.timed ? strings.withTimeLimit : strings.withoutTimeLimit}
        </span>
      </Title>
      <p className="score">
        <span className="big-number">{strings.number(result.score)}</span>{' '}
        <span className="secondary">{strings.ofTotal(MAXIMUM_SCORE)}</span>
      </p>
      <p className={`mock-standing mock-standing-${standing}`}>
        <span className={standing === 'at-target' ? 'mark mark-done' : 'mark'} aria-hidden="true" />
        {strings.scoreStandings[standing](PASS_SCORE, READINESS_SCORE)}
      </p>
      <dl className="module-scores part-scores">
        {result.parts.map((part) => (
          <div key={part.part}>
            <dt>{strings.packPart(part.part)}</dt>
            <dd>{strings.partRight(part.correct, part.total)}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

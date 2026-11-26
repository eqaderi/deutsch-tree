import { Suspense, use } from 'react'
import { Link } from 'react-router'
import { useLanguage } from '../language/index.tsx'
import { READINESS_SCORE, readinessOf } from '../learning-engine/index.ts'
import { loadOfficialMockExams } from './content.ts'
import { useProgress } from './progress.ts'

/**
 * The last stop of the tree: the exam. It states the readiness rule and the
 * warning to keep the official mock exams unseen, and leads to the readiness
 * view and to the original mock exams for practice. The tree does not wait for it.
 */
export function ExamStop() {
  return (
    <Suspense fallback={null}>
      <Stop />
    </Suspense>
  )
}

function Stop() {
  const { strings } = useLanguage()
  const { exams } = use(loadOfficialMockExams())
  const result = readinessOf(useProgress(), exams)

  return (
    <div className="stop">
      <span className="stop-dot" aria-hidden="true" />
      <section className="panel exam-stop" aria-labelledby="exam-stop-heading">
        <div className="exam-stop-text">
          <h3 id="exam-stop-heading" className="stop-name">
            {strings.examStopTitle}
          </h3>
          <p className="secondary">{strings.readinessRule(READINESS_SCORE, result.needed)}</p>
          <p className="exam-stop-warning">{strings.examStopWarning}</p>
        </div>
        <Link to="/readiness" className="row">
          <span className={result.ready ? 'mark mark-done' : 'mark'} aria-hidden="true" />
          <span className="row-text">
            <span className="row-title">{strings.openReadiness}</span>
          </span>
          <span className="pill">{result.ready ? strings.ready : strings.notReady}</span>
        </Link>
        <Link to="/mock-exams" className="row">
          <span className="mark" aria-hidden="true" />
          <span className="row-text">
            <span className="row-title">{strings.openMockExams}</span>
          </span>
        </Link>
      </section>
    </div>
  )
}

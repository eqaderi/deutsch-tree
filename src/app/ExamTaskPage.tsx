import { useState } from 'react'
import type { ExamTask } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import {
  applyEnteredScore,
  enteredScores,
  isDone,
  MAXIMUM_SCORE,
  passMark,
  scorePasses,
} from '../learning-engine/index.ts'
import { CopyPrompt, ScoreEntry, TaskSheetView } from './AssistantGrading.tsx'
import { updateProgress, useProgress } from './progress.ts'

/**
 * The sections of a writing or speaking node, in this fixed order: the task,
 * how to get it graded by an AI assistant (with the prompt to copy), and the
 * score that the learner types in. 90 or more marks the node done.
 */
export function ExamTaskSections({ nodeId, task }: { nodeId: string; task: ExamTask }) {
  const { strings } = useLanguage()
  const steps = task.module === 'schreiben' ? strings.writingSteps : strings.speakingSteps
  return (
    <>
      <section className="panel" aria-labelledby="section-task">
        <h2 id="section-task" className="cap">
          {strings.task}
        </h2>
        <TaskSheetView task={task} />
      </section>

      <section className="panel" aria-labelledby="section-prompt">
        <h2 id="section-prompt" className="cap">
          {strings.getYourScore}
        </h2>
        <ol className="steps">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
        <CopyPrompt task={task} />
        <div className="prompt-notes secondary">
          <p>{strings.promptNote}</p>
          {task.module === 'sprechen' && <p>{strings.pronunciationNote}</p>}
        </div>
      </section>

      <NodeScore nodeId={nodeId} />
    </>
  )
}

/** The scores entered for a node, and the box to enter the next one. */
function NodeScore({ nodeId }: { nodeId: string }) {
  const { strings } = useLanguage()
  const progress = useProgress()
  const scores = enteredScores(progress, nodeId)
  const latest = scores.at(-1)
  const done = isDone(progress, nodeId)
  // What the last score entered on this visit did, so that the learner is told once.
  const [entered, setEntered] = useState<{ wasDone: boolean } | null>(null)

  const enter = (score: number) => {
    setEntered({ wasDone: isDone(progress, nodeId) })
    updateProgress((before) => applyEnteredScore(before, nodeId, score))
  }

  const needed = strings.scoreNeeded(passMark(MAXIMUM_SCORE), MAXIMUM_SCORE)
  return (
    <section className="panel" aria-labelledby="section-score">
      <h2 id="section-score" className="cap">
        {strings.yourScore}
      </h2>

      {latest === undefined ? (
        <div className="message">
          <p>{strings.noScoreYet}</p>
          <p className="secondary">{needed}</p>
        </div>
      ) : (
        <>
          <p className="score">
            <span className="big-number">{strings.number(latest)}</span>{' '}
            <span className="secondary">{strings.ofTotal(MAXIMUM_SCORE)}</span>
          </p>
          {/*
            What the last score did, told against the node's state now: the learner may have
            un-marked the node since, and then it is not done, whatever the score did.
          */}
          <div className="message" role="status">
            {entered && done && (
              <p>{entered.wasDone || !scorePasses(latest) ? strings.topicStaysDone : strings.topicNowDone}</p>
            )}
            {entered && !done && !entered.wasDone && !scorePasses(latest) ? (
              <>
                <p>{needed}</p>
                <p>{strings.scoreRetry}</p>
              </>
            ) : (
              !done && <p>{needed}</p>
            )}
          </div>
        </>
      )}

      {scores.length > 1 && (
        <>
          <h3 id="score-history" className="cap">
            {strings.scoresSoFar}
          </h3>
          <ol className="score-history" aria-labelledby="score-history">
            {scores.map((score, index) => (
              <li key={index} className="pill">
                {strings.number(score)}
              </li>
            ))}
          </ol>
        </>
      )}

      <ScoreEntry onScore={enter} />
    </section>
  )
}

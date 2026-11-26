/**
 * The pieces a learner needs to have a writing task or a speaking part
 * graded by an AI assistant: the task, the prompt to copy, and the box for
 * the score that comes back.
 *
 * None of them knows about nodes or about progress, so a mock exam can use
 * them for its Schreiben and Sprechen modules as well as a node page does.
 * The app calls no AI service: `CopyPrompt` only puts text on the clipboard.
 */
import { type FormEvent, useId, useState } from 'react'
import { assistantPrompt, type TaskBlock, taskSheet } from '../assistant-grading/index.ts'
import type { ExamTask } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { readScore } from '../learning-engine/index.ts'

/** The task as the learner reads it. It is German, like the sheet in the exam, in every language. */
export function TaskSheetView({ task }: { task: ExamTask }) {
  const sheet = taskSheet(task)
  return (
    <div className="de task-sheet" lang="de" dir="ltr">
      <p className="task-part">{sheet.title}</p>
      {sheet.blocks.map((block, index) => (
        <TaskBlockView key={index} block={block} />
      ))}
    </div>
  )
}

function TaskBlockView({ block }: { block: TaskBlock }) {
  switch (block.type) {
    case 'text':
      return <p>{block.text}</p>
    case 'quote':
      return (
        <blockquote className="task-quote">
          <cite>{block.author}</cite>
          <p>{block.text}</p>
        </blockquote>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List className="task-points">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </List>
      )
    }
  }
}

/**
 * How to have this task graded: the steps for writing or for speaking, the
 * prompt to copy, and what to know about the prompt and the score.
 */
export function GradingSteps({ task }: { task: ExamTask }) {
  const { strings } = useLanguage()
  const steps = task.module === 'schreiben' ? strings.writingSteps : strings.speakingSteps
  return (
    <>
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
    </>
  )
}

/**
 * The button that copies the prompt for this task, in the learner's language,
 * and the prompt itself to read. When the browser refuses to copy, the prompt
 * opens so that the learner can select and copy it by hand.
 */
export function CopyPrompt({ task }: { task: ExamTask }) {
  const { language, strings } = useLanguage()
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  const [open, setOpen] = useState(false)
  const prompt = assistantPrompt(task, language)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied('yes')
    } catch {
      // No clipboard in this browser, or no permission to use it.
      setCopied('no')
      setOpen(true)
    }
  }

  return (
    <div className="prompt">
      <button type="button" className="btn btn-main" onClick={copy}>
        {strings.copyPrompt}
      </button>
      <p className="prompt-status" role="status">
        {copied === 'yes' && strings.promptCopied}
        {copied === 'no' && strings.promptNotCopied}
      </p>
      <details className="prompt-details" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>{strings.readPrompt}</summary>
        {/* English and German, so left to right in every language. Read-only: it can be selected, not changed. */}
        <textarea
          className="prompt-text"
          aria-label={strings.thePrompt}
          value={prompt}
          readOnly
          dir="ltr"
          lang="en"
          rows={12}
          onFocus={(event) => event.currentTarget.select()}
        />
      </details>
    </div>
  )
}

/**
 * The box a learner types a score out of 100 into. `onScore` gets the score
 * once it is a whole number from 0 to 100; anything else is refused with a
 * message. Persian digits are read as digits.
 */
export function ScoreEntry({ onScore }: { onScore: (score: number) => void }) {
  const { strings } = useLanguage()
  const [typed, setTyped] = useState('')
  const [refused, setRefused] = useState(false)
  const id = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const score = readScore(typed)
    // An empty box is refused like any other text that is not a score: there is nothing to save.
    setRefused(typeof score !== 'number')
    if (typeof score !== 'number') return
    setTyped('')
    onScore(score)
  }

  return (
    <form className="score-form" onSubmit={submit} noValidate>
      <label htmlFor={id}>{strings.scoreLabel}</label>
      <div className="score-fields">
        <input
          id={id}
          className="score-input"
          // Not type="number": that refuses the digits of a Persian keyboard.
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          dir="ltr"
          value={typed}
          aria-invalid={refused}
          aria-describedby={refused ? `${id}-problem` : undefined}
          onChange={(event) => setTyped(event.target.value)}
        />
        <button type="submit" className="btn">
          {strings.saveScore}
        </button>
      </div>
      {refused && (
        <p id={`${id}-problem`} className="score-problem" role="alert">
          {strings.scoreNotValid}
        </p>
      )}
    </form>
  )
}

import type { Language } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'

/**
 * What a report says about a question: its id inside the node and its German
 * prompt. An item of a practice task is named with its task: "t1/i3".
 */
export interface ReportedQuestion {
  id: string
  prompt: string
}

const NEW_ISSUE = 'https://github.com/eqaderi/deutsch-tree/issues/new'

/**
 * The address of a new issue in the project, pre-filled so that it names the
 * node and the question. The text is English in every language: it is written
 * for the maintainers, and the learner adds to it in any language.
 */
export function reportProblemUrl(nodeId: string, question: ReportedQuestion, language: Language): string {
  const body = [
    `Topic: ${nodeId}`,
    `Question: ${question.id}`,
    `Prompt: ${question.prompt}`,
    `Language of the page: ${language}`,
    '',
    'What is wrong with this question?',
    '',
    '',
  ].join('\n')
  const fields = new URLSearchParams({ title: `Problem with question ${question.id} of ${nodeId}`, body })
  return `${NEW_ISSUE}?${fields}`
}

/**
 * The "report a problem" link of one question. It is a plain link that opens
 * in a new tab when the learner follows it; the app itself sends nothing.
 */
export function ReportProblem({ nodeId, question }: { nodeId: string; question: ReportedQuestion }) {
  const { language, strings } = useLanguage()
  return (
    <a className="report" href={reportProblemUrl(nodeId, question, language)} target="_blank" rel="noopener noreferrer">
      {strings.reportProblem}
    </a>
  )
}

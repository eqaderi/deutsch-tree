import type { Language, Question } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'

const NEW_ISSUE = 'https://github.com/eqaderi/deutsch-tree/issues/new'

/**
 * The address of a new issue in the project, pre-filled so that it names the
 * node and the question. The text is English in every language: it is written
 * for the maintainers, and the learner adds to it in any language.
 */
export function reportProblemUrl(nodeId: string, question: Question, language: Language): string {
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
export function ReportProblem({ nodeId, question }: { nodeId: string; question: Question }) {
  const { language, strings } = useLanguage()
  return (
    <a className="report" href={reportProblemUrl(nodeId, question, language)} target="_blank" rel="noopener noreferrer">
      {strings.reportProblem}
    </a>
  )
}

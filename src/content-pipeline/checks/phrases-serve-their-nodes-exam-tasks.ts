import { type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/**
 * The exam tasks of a phrase and of its node agree.
 *
 * A phrase serves one or more of the exam tasks its node names. Those are
 * checked to be exam-part nodes, so the task of a phrase cannot point at
 * nothing. And a published node names no exam task that none of its phrases
 * serves; a draft may still be on its way there.
 */
export const phrasesServeTheirNodesExamTasks: ContentCheck = ({ nodes }) => {
  const problems: ContentProblem[] = []

  for (const checked of nodes) {
    const { phrases, examTasks = [], status } = checked.node
    if (!phrases) continue

    phrases.forEach((phrase, phraseIndex) => {
      phrase.examTasks.forEach((task, taskIndex) => {
        if (examTasks.includes(task)) return
        problems.push(
          problemIn(checked, {
            where: `phrases[${phraseIndex}].examTasks[${taskIndex}]`,
            message: `"${task}" is not an exam task of this node. A phrase serves one or more of the node's own examTasks: ${examTasks.join(', ')}`,
          }),
        )
      })
    })

    if (status !== 'published') continue
    examTasks.forEach((task, index) => {
      if (phrases.some((phrase) => phrase.examTasks.includes(task))) return
      problems.push(
        problemIn(checked, {
          where: `examTasks[${index}]`,
          message: `no phrase of this node serves "${task}"; name it in a phrase or take it out here`,
        }),
      )
    })
  }

  return problems
}

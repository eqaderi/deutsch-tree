import { type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/** Every exam task that a phrases node says it serves is the id of an exam-part node. */
export const examTasksAreExamParts: ContentCheck = ({ nodes, ids }) => {
  const kindOf = new Map(nodes.map(({ node }) => [node.id, node.kind]))
  const problems: ContentProblem[] = []

  for (const checked of nodes) {
    checked.node.examTasks?.forEach((task, index) => {
      const where = `examTasks[${index}]`
      if (!ids.has(task)) {
        problems.push(problemIn(checked, { where, message: `points nowhere: there is no node "${task}"` }))
        return
      }
      // A node file that failed the schema has no kind here; its own errors are reported already.
      const kind = kindOf.get(task)
      if (kind !== undefined && kind !== 'exam-part') {
        problems.push(
          problemIn(checked, {
            where,
            message: `is not an exam task: "${task}" is a ${kind} node, not an exam-part node`,
          }),
        )
      }
    })
  }

  return problems
}

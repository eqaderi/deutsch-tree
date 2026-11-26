import { type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/** No two node files share an id. The first file keeps it; every later one is a problem. */
export const nodeIdsAreUnique: ContentCheck = ({ nodes }) => {
  const firstFile = new Map<string, string>()
  const problems: ContentProblem[] = []
  for (const checked of nodes) {
    const { id } = checked.node
    const first = firstFile.get(id)
    if (first === undefined) {
      firstFile.set(id, checked.file)
    } else {
      problems.push(
        problemIn(checked, { where: 'id', message: `duplicated node id: "${id}" is also the id of ${first}` }),
      )
    }
  }
  return problems
}

/** No two questions of one node share an id. */
export const questionIdsAreUnique: ContentCheck = ({ nodes }) => {
  const problems: ContentProblem[] = []
  for (const checked of nodes) {
    const firstPlace = new Map<string, number>()
    for (const [index, question] of (checked.node.questions ?? []).entries()) {
      const first = firstPlace.get(question.id)
      if (first === undefined) {
        firstPlace.set(question.id, index)
      } else {
        problems.push(
          problemIn(checked, {
            question: question.id,
            where: `questions[${index}].id`,
            message: `duplicated question id: "${question.id}" is also the id of questions[${first}]`,
          }),
        )
      }
    }
  }
  return problems
}

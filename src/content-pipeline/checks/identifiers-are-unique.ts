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

/**
 * No two practice tasks of one node share an id, and inside one task no two
 * texts and no two items. Two tasks may both have an item "i1": an item is
 * always named with its task ("t1/i1").
 */
export const practiceIdsAreUnique: ContentCheck = ({ nodes }) => {
  const problems: ContentProblem[] = []
  for (const checked of nodes) {
    /** Reports every id in `list` that an earlier entry already has. */
    const unique = (list: ReadonlyArray<{ id: string }>, place: string, what: string, task?: string) => {
      const firstPlace = new Map<string, number>()
      for (const [index, { id }] of list.entries()) {
        const first = firstPlace.get(id)
        if (first === undefined) {
          firstPlace.set(id, index)
          continue
        }
        problems.push(
          problemIn(checked, {
            ...(task === undefined ? {} : { question: `${task}/${id}` }),
            where: `${place}[${index}].id`,
            message: `duplicated ${what} id: "${id}" is also the id of ${place}[${first}]`,
          }),
        )
      }
    }

    const tasks = checked.node.practice ?? []
    for (const [index, task] of tasks.entries()) {
      unique(task.texts, `practice[${index}].texts`, 'text')
      unique(task.items, `practice[${index}].items`, 'item', task.id)
    }
    unique(tasks, 'practice', 'task')
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

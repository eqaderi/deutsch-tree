import { CHAPTERS_FILE, type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/** Every node names a chapter of the chapter list, and has that chapter's level and kind. */
export const nodesBelongToAChapter: ContentCheck = ({ nodes, chapters }) => {
  if (chapters === null) return []

  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]))
  const problems: ContentProblem[] = []

  for (const checked of nodes) {
    const { node } = checked
    const chapter = byId.get(node.chapter)
    if (chapter === undefined) {
      problems.push(
        problemIn(checked, {
          where: 'chapter',
          message: `points nowhere: there is no chapter "${node.chapter}" in ${CHAPTERS_FILE}`,
        }),
      )
      continue
    }
    if (node.level !== chapter.level) {
      problems.push(
        problemIn(checked, {
          where: 'level',
          message: `is ${node.level}, but its chapter "${chapter.id}" is a chapter of ${chapter.level}`,
        }),
      )
    }
    if (node.kind !== chapter.kind) {
      problems.push(
        problemIn(checked, {
          where: 'kind',
          message: `is ${node.kind}, but its chapter "${chapter.id}" is a ${chapter.kind} chapter`,
        }),
      )
    }
  }

  return problems
}

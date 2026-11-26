import { type ContentCheck, problemIn } from './check.ts'

/** Every prerequisite is the id of a node. */
export const prerequisitesExist: ContentCheck = ({ nodes, ids }) =>
  nodes.flatMap((checked) =>
    checked.node.prerequisites.flatMap((prerequisite, index) =>
      ids.has(prerequisite)
        ? []
        : [
            problemIn(checked, {
              where: `prerequisites[${index}]`,
              message: `points nowhere: there is no node "${prerequisite}"`,
            }),
          ],
    ),
  )

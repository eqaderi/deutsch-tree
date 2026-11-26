import { type CheckedNode, type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/**
 * No node is, directly or through other nodes, its own prerequisite.
 *
 * Follows each chain of prerequisites once (a depth-first walk without
 * recursion), so the time grows with the number of nodes plus prerequisites.
 * A cycle is reported once, on its node with the smallest id.
 */
export const prerequisitesHaveNoCycle: ContentCheck = ({ nodes }) => {
  const byId = new Map<string, CheckedNode>()
  for (const checked of nodes) {
    if (!byId.has(checked.node.id)) byId.set(checked.node.id, checked)
  }

  const problems = new Map<string, ContentProblem>()
  const finished = new Set<string>()

  for (const start of [...byId.keys()].sort()) {
    if (finished.has(start)) continue

    // The chain being followed, and for each node in it which prerequisite comes next.
    const chain = [{ id: start, next: 0 }]
    const placeInChain = new Map([[start, 0]])

    for (let last = chain.at(-1); last !== undefined; last = chain.at(-1)) {
      const prerequisite = byId.get(last.id)?.node.prerequisites[last.next++]
      if (prerequisite === undefined) {
        finished.add(last.id)
        placeInChain.delete(last.id)
        chain.pop()
        continue
      }

      const place = placeInChain.get(prerequisite)
      if (place !== undefined) {
        const cycle = fromSmallestId(chain.slice(place).map((link) => link.id))
        const first = byId.get(cycle[0] as string) as CheckedNode
        problems.set(cycle.join(' '), problemIn(first, { where: 'prerequisites', message: inWords(cycle) }))
      } else if (byId.has(prerequisite) && !finished.has(prerequisite)) {
        placeInChain.set(prerequisite, chain.length)
        chain.push({ id: prerequisite, next: 0 })
      }
    }
  }

  return [...problems.values()]
}

/** The same cycle, written from its smallest id, so that it reads the same wherever the walk entered it. */
function fromSmallestId(cycle: string[]): string[] {
  const start = cycle.indexOf(cycle.toSorted()[0] as string)
  return [...cycle.slice(start), ...cycle.slice(0, start)]
}

/** "a needs b, which needs c, which needs a" */
function inWords(cycle: string[]): string {
  const [first, ...rest] = [...cycle, cycle[0]]
  return `prerequisite cycle: ${first} needs ${rest.join(', which needs ')}`
}

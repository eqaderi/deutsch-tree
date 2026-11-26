import type { NodeKind, NodeStatus } from '../../src/content-model/index.ts'
import { applyAttempt, emptyProgress, type Progress } from '../../src/learning-engine/index.ts'

export interface TestNode {
  id: string
  level: string
  kind: NodeKind
  status: NodeStatus
}

/**
 * A curriculum written as one line per node, in curriculum order:
 *
 *   curriculum('A1 grammar g1', 'A1 vocabulary v1 soon', 'A2 grammar g2')
 *
 * A node is published unless its line ends in "soon".
 */
export function curriculum(...lines: string[]): TestNode[] {
  return lines.map((line) => {
    const [level = '', kind = '', id = '', soon] = line.split(' ')
    return { id, level, kind: kind as NodeKind, status: soon === 'soon' ? 'coming-soon' : 'published' }
  })
}

/** Progress in which exactly these nodes are done. */
export function doneWith(...ids: string[]): Progress {
  return ids.reduce((progress, id) => applyAttempt(progress, id, { passed: true }), emptyProgress())
}

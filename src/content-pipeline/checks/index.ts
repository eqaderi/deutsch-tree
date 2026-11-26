import type { ContentCheck } from './check.ts'
import { nodeIdsAreUnique, questionIdsAreUnique } from './identifiers-are-unique.ts'
import { poolIsLargeEnough } from './pool-is-large-enough.ts'
import { prerequisitesExist } from './prerequisites-exist.ts'
import { prerequisitesHaveNoCycle } from './prerequisites-have-no-cycle.ts'
import { publishedNodeIsReviewed } from './published-node-is-reviewed.ts'

export type { CheckedNode, ContentCheck, ContentProblem, ContentUnderCheck } from './check.ts'

/** Every content check, in the order their problems appear in the report. */
export const CHECKS: ContentCheck[] = [
  nodeIdsAreUnique,
  questionIdsAreUnique,
  prerequisitesExist,
  prerequisitesHaveNoCycle,
  poolIsLargeEnough,
  publishedNodeIsReviewed,
]

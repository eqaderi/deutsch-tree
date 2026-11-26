import { assistantGradedNodeHasNoPool } from './assistant-graded-node-has-no-pool.ts'
import type { ContentCheck } from './check.ts'
import { examTasksAreExamParts } from './exam-tasks-are-exam-parts.ts'
import { germanInPersianIsMarked } from './german-in-persian-is-marked.ts'
import { nodeIdsAreUnique, questionIdsAreUnique } from './identifiers-are-unique.ts'
import { nodesBelongToAChapter } from './nodes-belong-to-a-chapter.ts'
import { poolIsLargeEnough } from './pool-is-large-enough.ts'
import { prerequisitesExist } from './prerequisites-exist.ts'
import { prerequisitesHaveNoCycle } from './prerequisites-have-no-cycle.ts'
import { publishedNodeIsReviewed } from './published-node-is-reviewed.ts'
import { vocabularyMeaningsDiffer } from './vocabulary-meanings-differ.ts'

export type { CheckedNode, ContentCheck, ContentProblem, ContentUnderCheck } from './check.ts'
export { CHAPTERS_FILE } from './check.ts'

/** Every content check, in the order their problems appear in the report. */
export const CHECKS: ContentCheck[] = [
  nodeIdsAreUnique,
  questionIdsAreUnique,
  nodesBelongToAChapter,
  germanInPersianIsMarked,
  prerequisitesExist,
  prerequisitesHaveNoCycle,
  examTasksAreExamParts,
  poolIsLargeEnough,
  vocabularyMeaningsDiffer,
  publishedNodeIsReviewed,
  assistantGradedNodeHasNoPool,
]

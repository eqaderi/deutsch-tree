import { assistantGradedNodeHasNoPool } from './assistant-graded-node-has-no-pool.ts'
import type { ContentCheck } from './check.ts'
import { examTasksAreExamParts } from './exam-tasks-are-exam-parts.ts'
import { germanInPersianIsMarked } from './german-in-persian-is-marked.ts'
import { nodeIdsAreUnique, practiceIdsAreUnique, questionIdsAreUnique } from './identifiers-are-unique.ts'
import { nodesBelongToAChapter } from './nodes-belong-to-a-chapter.ts'
import { persianIsSpeltToTheStyleGuide } from './persian-is-spelt-to-the-style-guide.ts'
import { phrasesServeTheirNodesExamTasks } from './phrases-serve-their-nodes-exam-tasks.ts'
import { phrasesTestNeedsATypedAnswer } from './phrases-test-needs-a-typed-answer.ts'
import { poolIsLargeEnough } from './pool-is-large-enough.ts'
import { practiceTaskFitsItsPart } from './practice-task-fits-its-part.ts'
import { prerequisitesExist } from './prerequisites-exist.ts'
import { prerequisitesHaveNoCycle } from './prerequisites-have-no-cycle.ts'
import { publishedNodeIsReviewed } from './published-node-is-reviewed.ts'
import { recogniseOnlyAsksForUnderstanding } from './recognise-only-asks-for-understanding.ts'
import { vocabularyAgreesWithTheScopeList } from './vocabulary-agrees-with-the-scope-list.ts'
import { vocabularyCoversTheScopeList } from './vocabulary-covers-the-scope-list.ts'
import { vocabularyMeaningsDiffer } from './vocabulary-meanings-differ.ts'

export type { CheckedNode, ContentCheck, ContentProblem, ContentUnderCheck } from './check.ts'
export { CHAPTERS_FILE, formatPath } from './check.ts'

/** Every content check, in the order their problems appear in the report. */
export const CHECKS: ContentCheck[] = [
  nodeIdsAreUnique,
  questionIdsAreUnique,
  practiceIdsAreUnique,
  nodesBelongToAChapter,
  germanInPersianIsMarked,
  persianIsSpeltToTheStyleGuide,
  prerequisitesExist,
  prerequisitesHaveNoCycle,
  examTasksAreExamParts,
  phrasesServeTheirNodesExamTasks,
  poolIsLargeEnough,
  vocabularyMeaningsDiffer,
  recogniseOnlyAsksForUnderstanding,
  phrasesTestNeedsATypedAnswer,
  practiceTaskFitsItsPart,
  publishedNodeIsReviewed,
  vocabularyCoversTheScopeList,
  vocabularyAgreesWithTheScopeList,
  assistantGradedNodeHasNoPool,
]

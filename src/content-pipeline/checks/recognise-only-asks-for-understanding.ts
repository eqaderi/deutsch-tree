import { type NodeFile, PRODUCING_QUESTION_TYPES } from '../../content-model/index.ts'
import { type ContentCheck, problemIn } from './check.ts'

type QuestionType = NonNullable<NodeFile['questions']>[number]['type']

const producing: readonly QuestionType[] = PRODUCING_QUESTION_TYPES

/** Every type a recognise-only pool may use, in the order the schema lists them. */
const UNDERSTANDING: QuestionType[] = [
  'multiple-choice',
  'gap-fill',
  'true-false',
  'find-error',
  'matching',
] satisfies Array<Exclude<QuestionType, (typeof PRODUCING_QUESTION_TYPES)[number]>>

/**
 * A recognise-only node is one the learner must understand but need not
 * produce, so its test asks only for understanding. This holds for a draft
 * pool too, so that a pool is never written the wrong way first.
 */
export const recogniseOnlyAsksForUnderstanding: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    if (!checked.node.recogniseOnly) return []
    return (checked.node.questions ?? []).flatMap((question, index) =>
      producing.includes(question.type)
        ? [
            problemIn(checked, {
              question: question.id,
              where: `questions[${index}].type`,
              message: `a ${question.type} question asks the learner to produce the form, but a recognise-only node asks only for understanding: use ${UNDERSTANDING.slice(0, -1).join(', ')} or ${UNDERSTANDING.at(-1)}`,
            }),
          ]
        : [],
    )
  })

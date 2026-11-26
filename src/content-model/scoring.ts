/**
 * How a node is scored: by questions drawn from its pool, or by an AI
 * assistant outside the app.
 *
 * These functions are apart from index.ts so that the app can use them
 * without loading the schema of the node files, which only the content
 * pipeline needs. The app imports them from here, never from index.ts.
 */
import type {
  ExamModule,
  GrammarContent,
  HeardText,
  NodeContent,
  NodeKind,
  PhrasesContent,
  PracticeContent,
  TaskText,
  VocabularyContent,
} from './index.ts'

/**
 * The modules that the app cannot score itself. Their nodes have no question
 * pool: the learner does a task, an AI assistant grades it with the prompt
 * the app provides, and the learner types the score in.
 */
export const ASSISTANT_GRADED_MODULES = ['schreiben', 'sprechen'] as const
export type AssistantGradedModule = (typeof ASSISTANT_GRADED_MODULES)[number]

/** Whether a node is a writing or speaking exam part: graded by an AI assistant, with no question pool. */
export function isAssistantGraded(node: { kind: NodeKind; module?: ExamModule | undefined }): node is {
  kind: 'exam-part'
  module: AssistantGradedModule
} {
  return node.kind === 'exam-part' && (ASSISTANT_GRADED_MODULES as readonly unknown[]).includes(node.module)
}

/** Whether a published node is tested by questions drawn from its pool. An exam part is not. */
export function hasPool(content: NodeContent): content is GrammarContent | VocabularyContent | PhrasesContent {
  return 'questions' in content
}

/** Whether a published node is a reading part, practised with tasks that the app scores per item. */
export function hasPractice(content: NodeContent): content is PracticeContent {
  return 'practice' in content
}

/** Whether a text of a task is heard (Hören), line by line in its speakers' voices, rather than read. */
export function isHeard(text: TaskText): text is HeardText {
  return 'lines' in text
}

/** Whether the content is that of a grammar node: rule, table, examples, mistakes and a written pool. */
export function isGrammar(content: NodeContent): content is GrammarContent {
  return 'table' in content
}

/** Whether the content is that of a vocabulary node: its words, and the pool made from them. */
export function isVocabulary(content: NodeContent): content is VocabularyContent {
  return 'words' in content
}

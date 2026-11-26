import { useLanguage } from '../language/index.tsx'

/**
 * The label of a recognise-only topic: one the exam asks the learner to
 * understand, never to use. It stands wherever the learner meets the topic:
 * its row in the tree, its page and its test.
 */
export function RecogniseOnlyLabel() {
  const { strings } = useLanguage()
  return <span className="tag tag-recognise">{strings.recogniseOnly}</span>
}

/** What the label means, in a sentence: on the topic's page, and on its test. */
export function RecogniseOnlyNote({ on }: { on: 'page' | 'test' }) {
  const { strings } = useLanguage()
  return <p className="recognise-note">{on === 'page' ? strings.recogniseOnlyNote : strings.recogniseOnlyTest}</p>
}

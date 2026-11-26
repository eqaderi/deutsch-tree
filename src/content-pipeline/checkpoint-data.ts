/**
 * Builds the data of each level's checkpoint: the pool of every published
 * topic of the level that has one, in curriculum order. A checkpoint fetches
 * the file of its level and no node file, so one request serves it however
 * many topics the level has.
 *
 * An exam part gives nothing: what it asks is a whole task, and an item of a
 * task cannot be asked without the text it is about. A writing or speaking
 * part has no pool at all.
 */
import type { CheckpointPool, CompiledNode, ContentIndex } from '../content-model/index.ts'
import { hasPool } from '../content-model/scoring.ts'

/** `nodes` must be in curriculum order. Every level of the index has an entry, empty when it gives nothing. */
export function checkpointData(nodes: CompiledNode[], index: ContentIndex): Record<string, CheckpointPool[]> {
  const levels = [...new Set([...index.chapters, ...index.nodes].map((item) => item.level))]
  return Object.fromEntries(
    levels.map((level) => [
      level,
      nodes.flatMap((node) =>
        node.level === level && node.content && hasPool(node.content)
          ? [{ nodeId: node.id, questions: node.content.questions }]
          : [],
      ),
    ]),
  )
}

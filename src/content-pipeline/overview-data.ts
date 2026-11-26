/**
 * Builds the data of the "all grammar at a glance" page: the table of every
 * published grammar node, in curriculum order. A node without a table (not
 * written yet, or explained by a diagram alone) is left out, so the page
 * never shows an empty box for it.
 */
import type { CompiledNode, GrammarOverview } from '../content-model/index.ts'
import { isGrammar } from '../content-model/scoring.ts'

/** `nodes` must be in curriculum order. */
export function overviewData(nodes: CompiledNode[]): GrammarOverview {
  return {
    tables: nodes.flatMap((node) =>
      node.kind === 'grammar' && node.content && isGrammar(node.content) && node.content.table
        ? [{ node: node.id, table: node.content.table }]
        : [],
    ),
  }
}

/**
 * The tree's address. What the tree shows is in the address (`#/?level=A2&kind=vocabulary`),
 * so the browser's back button, a reload and a link all keep it.
 */
import type { NodeKind } from '../content-model/index.ts'

/** What the tree shows: one level, and all kinds or one of them. */
export interface TreeView {
  level?: string
  /** Absent: all kinds. */
  kind?: NodeKind
}

/** The address of the tree showing this view. With nothing chosen, the tree opens where the learner is. */
export function treeAddress({ level, kind }: TreeView): string {
  const search = new URLSearchParams()
  if (level) search.set('level', level)
  if (kind) search.set('kind', kind)
  const query = search.toString()
  return query ? `/?${query}` : '/'
}

let lastView: TreeView = {}

/** The tree calls this with what it shows. */
export function rememberTreeView(view: TreeView): void {
  lastView = view
}

/**
 * The tree as the learner last saw it, until the page is reloaded. Links
 * "back to the tree" from a page that is no topic go here.
 */
export function lastTreeAddress(): string {
  return treeAddress(lastView)
}

/**
 * The tree at a topic's level: where "back to the tree" leads from the
 * topic's page, its test and its result. The learner then sees the topic they
 * come from, also after finishing the last topic of a level, when the tree
 * would otherwise open at the next one. A kind they chose stays chosen if the
 * topic is of that kind.
 */
export function treeAddressOf(topic: { level: string; kind: NodeKind }): string {
  return treeAddress({ level: topic.level, kind: lastView.kind === topic.kind ? topic.kind : undefined })
}

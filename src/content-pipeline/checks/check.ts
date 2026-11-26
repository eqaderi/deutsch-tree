/**
 * What a content check is. A check is a rule that the schema of one node file
 * cannot state: it needs the other nodes, other files, or a number of the
 * project. How to add one: content/README.md, "Adding a check".
 */
import type { ChapterEntry, NodeFile } from '../../content-model/index.ts'

/** One thing a maintainer has to fix. */
export interface ContentProblem {
  /** Path of the file, relative to the content folder. */
  file: string
  /** Id of the node. Absent only when the problem is not about one node. */
  node?: string
  /** Id of the question, when the problem is inside one. */
  question?: string
  /** Where in the file, such as `questions[1].answer`. Absent for whole-file problems. */
  where?: string
  message: string
}

/** A node file that passed the schema. */
export interface CheckedNode {
  /** Path of the file, relative to the content folder. */
  file: string
  node: NodeFile
}

export interface ContentUnderCheck {
  /** The content folder, for a check that looks at files beside the node files. */
  contentDir: string
  /** Every node file that passed the schema, in file order. Two may share an id; one check reports that. */
  nodes: CheckedNode[]
  /** The id of every node file, including files that failed the schema. */
  ids: ReadonlySet<string>
  /** The chapter list, in curriculum order. Null when chapters.yaml is unusable; the pipeline reports that itself. */
  chapters: readonly ChapterEntry[] | null
}

/** Returns one problem per thing to fix; an empty list when the content passes. */
export type ContentCheck = (content: ContentUnderCheck) => ContentProblem[] | Promise<ContentProblem[]>

/** A problem in `node`, with the file and the node id filled in. */
export function problemIn(
  { file, node }: CheckedNode,
  rest: { question?: string; where?: string; message: string },
): ContentProblem {
  return { file, node: node.id, ...rest }
}

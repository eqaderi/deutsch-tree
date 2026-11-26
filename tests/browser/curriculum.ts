/**
 * Lets a journey run on a tree of its own instead of the two fixture topics:
 * many levels, kinds and chapters, written in a few lines.
 *
 * The app reads the tree from one file, `content/index.json`. `serveCurriculum`
 * answers that request with an invented index, so the built site stays as it
 * is. Only the fixture topic `grammar-001` has a page and a test behind it:
 * give that id to the one topic a journey opens or tests.
 */
import type { Page } from '@playwright/test'
import type { ChapterSummary, ContentIndex, NodeKind, NodeSummary } from '../../src/content-model/index.ts'

export interface ChapterOfTopics {
  level: string
  kind: NodeKind
  /** The chapter's name, the same in every language. */
  name: string
  /**
   * One topic per entry, in order: its id, then any of these words.
   *   "soon"     not written yet
   *   "no-test"  published, but done in another way than a test
   *   "after:x"  builds on the topic x
   * A topic is named "Topic <id>", except grammar-001, which keeps "Fixture verbs".
   */
  topics: string[]
}

export function curriculumIndex(chapters: ChapterOfTopics[]): ContentIndex {
  const everyLanguage = (text: string) => ({ en: [text], fa: [text], de: [text] })
  const index: ContentIndex = { chapters: [], nodes: [] }
  chapters.forEach((chapter, place) => {
    const summary: ChapterSummary = {
      id: `chapter-${place + 1}`,
      level: chapter.level,
      kind: chapter.kind,
      title: everyLanguage(chapter.name),
    }
    index.chapters.push(summary)
    chapter.topics.forEach((topic, order) => {
      const [id = '', ...words] = topic.split(' ')
      const soon = words.includes('soon')
      const node: NodeSummary = {
        id,
        kind: chapter.kind,
        level: chapter.level,
        chapter: summary.id,
        order: order + 1,
        status: soon ? 'coming-soon' : 'published',
        recogniseOnly: false,
        prerequisites: words.filter((word) => word.startsWith('after:')).map((word) => word.slice('after:'.length)),
        hasTest: !soon && !words.includes('no-test'),
        title: everyLanguage(id === 'grammar-001' ? 'Fixture verbs' : `Topic ${id}`),
      }
      index.nodes.push(node)
    })
  })
  return index
}

/** From now on, this page gets the given tree. Call it before `page.goto`. */
export async function serveCurriculum(page: Page, chapters: ChapterOfTopics[]): Promise<void> {
  const index = curriculumIndex(chapters)
  await page.route('**/content/index.json', (route) => route.fulfill({ json: index }))
}

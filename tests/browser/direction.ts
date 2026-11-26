import type { Locator } from '@playwright/test'

/**
 * Whether the first letter of the text is drawn to the left of its last
 * letter. This measures what the learner sees, whatever markup or style
 * produced it.
 */
export async function readsLeftToRight(text: Locator): Promise<boolean> {
  return text.evaluate((element) => {
    const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()
    const length = node?.textContent?.length ?? 0
    if (!node || length < 2) throw new Error('needs a text of two letters or more')
    const letter = (index: number) => {
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + 1)
      return range.getBoundingClientRect()
    }
    return letter(0).left < letter(length - 1).left
  })
}

/** Whether the element sits in the right half of the page's column. */
export async function startsOnTheRight(element: Locator): Promise<boolean> {
  const column = await element.page().getByRole('main').boundingBox()
  const box = await element.boundingBox()
  if (!column || !box) throw new Error('element is not on the page')
  return box.x + box.width / 2 > column.x + column.width / 2
}

/**
 * Mixing the things a question shows: the pieces of a word ordering question,
 * one side of a matching question.
 *
 * The node file holds them in the order that is the answer. `mixed` puts them
 * in an order that depends only on which things they are, so it tells nothing
 * about the answer, and it is the same on every run: a reviewer's sheet can
 * be compared with the question later, and a build gives the same bundle.
 */
import { createHash } from 'node:crypto'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** `items` in an order that follows from the items alone, whatever order they come in. */
export function mixed(items: readonly string[]): string[] {
  const sorted = [...items].sort(byText)
  const seed = hash(JSON.stringify(sorted))
  return sorted
    .map((item, index) => ({ item, place: hash(`${seed} ${index} ${item}`) }))
    .sort((a, b) => byText(a.place, b.place))
    .map(({ item }) => item)
}

/**
 * `mixed`, but never one of the orders in `answers`, unless every order is
 * one. For what a learner sees: a question must not arrive already solved.
 * It leans on the answer, so a reviewer's sheet uses `mixed` instead.
 */
export function mixedAwayFrom(items: readonly string[], answers: readonly (readonly string[])[]): string[] {
  const start = mixed(items)
  for (const order of everyOrder(start)) {
    if (!answers.some((answer) => sameOrder(answer, order))) return order
  }
  return start
}

/** Every order of `items`, beginning with the one they are in. */
function* everyOrder(items: string[]): Generator<string[]> {
  if (items.length <= 1) {
    yield items
    return
  }
  for (const [index, first] of items.entries()) {
    for (const rest of everyOrder(items.toSpliced(index, 1))) yield [first, ...rest]
  }
}

export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

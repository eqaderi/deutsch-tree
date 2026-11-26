/**
 * Loads the compiled content bundle that the content pipeline put next to the
 * site. The app never reads raw node files.
 *
 * Every function returns the same promise for the same request, so they can
 * be passed to React's `use()`.
 */
import type { CompiledNode, ContentIndex } from '../content-model/index.ts'

const requests = new Map<string, Promise<unknown>>()

function load<T>(file: string): Promise<T> {
  let request = requests.get(file)
  if (!request) {
    request = fetch(new URL(`content/${file}`, document.baseURI)).then((response) => {
      if (!response.ok) throw new Error(`Could not load content/${file} (${response.status})`)
      return response.json()
    })
    // A failed request is forgotten, so the next visit tries again.
    request.catch(() => requests.delete(file))
    requests.set(file, request)
  }
  return request as Promise<T>
}

/** Every node's summary, in curriculum order. */
export function loadIndex(): Promise<ContentIndex> {
  return load('index.json')
}

/** One node with its page content. */
export function loadNode(id: string): Promise<CompiledNode> {
  return load(`nodes/${id}.json`)
}

const groups = new Map<string, Promise<CompiledNode[]>>()

/**
 * Several nodes with their page content, in the order asked for. All are
 * requested at once; a node that was loaded before is not fetched again.
 */
export function loadNodes(ids: readonly string[]): Promise<CompiledNode[]> {
  const key = ids.join(' ')
  let group = groups.get(key)
  if (!group) {
    group = Promise.all(ids.map(loadNode))
    // A failed group is forgotten, like a failed request.
    group.catch(() => groups.delete(key))
    groups.set(key, group)
  }
  return group
}

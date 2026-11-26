/**
 * Loads the compiled content bundle that the content pipeline put next to the
 * site. The app never reads raw node files.
 *
 * Both functions return the same promise for the same request, so they can be
 * passed to React's `use()`.
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

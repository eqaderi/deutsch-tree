/**
 * Loads the compiled content bundle that the content pipeline put next to the
 * site. The app never reads raw node files.
 *
 * Every function returns the same promise for the same request, so it can be
 * passed to React's `use()`.
 *
 * A page asks only for what it shows: the tree for the index, a node page for
 * its node, and search and the overview page each for their own file. So the
 * first load of the tree stays small however much content there is.
 */
import type { CompiledNode, ContentIndex, GrammarOverview, Language, SearchData } from '../content-model/index.ts'

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

/** What search looks through in one language, besides the titles of the index. */
export function loadSearchData(language: Language): Promise<SearchData> {
  return load(`search/${language}.json`)
}

/** Every grammar table, for the "all grammar at a glance" page. */
export function loadOverview(): Promise<GrammarOverview> {
  return load('overview.json')
}

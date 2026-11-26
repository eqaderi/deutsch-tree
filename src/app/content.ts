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
import type {
  CheckpointPool,
  CompiledNode,
  ContentIndex,
  GrammarOverview,
  Language,
  MockExam,
  MockExamList,
  OfficialMockExams,
  SearchData,
} from '../content-model/index.ts'

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

/** The official mock exams, in the order the content lists them. */
export function loadOfficialMockExams(): Promise<OfficialMockExams> {
  return load('official-mock-exams.json')
}

/** The original mock exams, in order, without what is taken. */
export function loadMockExams(): Promise<MockExamList> {
  return load('mock-exams.json')
}

/** One original mock exam with its parts. */
export function loadMockExam(id: string): Promise<MockExam> {
  return load(`mock-exams/${id}.json`)
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

/** What search looks through in one language, besides the titles of the index. */
export function loadSearchData(language: Language): Promise<SearchData> {
  return load(`search/${language}.json`)
}

/** What each published topic of a level gives to the level's checkpoint, in curriculum order. */
export function loadCheckpoint(level: string): Promise<CheckpointPool[]> {
  return load(`checkpoints/${encodeURIComponent(level)}.json`)
}

/** Every grammar table, for the "all grammar at a glance" page. */
export function loadOverview(): Promise<GrammarOverview> {
  return load('overview.json')
}

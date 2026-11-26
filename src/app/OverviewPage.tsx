import { use } from 'react'
import { Link } from 'react-router'
import { useLanguage } from '../language/index.tsx'
import { loadIndex, loadOverview } from './content.ts'
import { RichText } from './German.tsx'
import { GrammarTableView } from './GrammarTableView.tsx'
import { BackToTree } from './NotFound.tsx'

/**
 * "All grammar at a glance": every grammar table on one page, grouped as in
 * the tree (level, then chapter), each under the name of its topic.
 *
 * Only what has a table is shown: a topic, a chapter or a level without one
 * takes no room.
 */
export function OverviewPage() {
  const { language, strings } = useLanguage()
  const { chapters, nodes } = use(loadIndex())
  const { tables } = use(loadOverview())

  const tableOf = new Map(tables.map((entry) => [entry.node, entry.table]))
  const withTable = nodes.flatMap((node) => {
    const table = tableOf.get(node.id)
    return table ? [{ node, table }] : []
  })
  // Chapters and nodes are in curriculum order already, so the levels come out in theirs.
  const levels = [...new Set(withTable.map(({ node }) => node.level))].map((level) => ({
    level,
    chapters: chapters
      .filter((chapter) => chapter.level === level)
      .map((chapter) => ({ chapter, topics: withTable.filter(({ node }) => node.chapter === chapter.id) }))
      .filter(({ topics }) => topics.length > 0),
  }))

  return (
    <main className="wrap">
      <title>{`${strings.overviewTitle} · ${strings.appName}`}</title>
      <BackToTree />
      <header className="page-head">
        <h1>{strings.overviewTitle}</h1>
        <p className="secondary">{levels.length === 0 ? strings.overviewEmpty : strings.overviewIntro}</p>
      </header>

      {levels.map(({ level, chapters }) => (
        <section key={level} className="overview-level">
          <h2 className="level-heading">
            {level}
            {strings.levelNames[level] && ` · ${strings.levelNames[level]}`}
          </h2>
          {chapters.map(({ chapter, topics }) => (
            <section key={chapter.id} className="overview-chapter">
              <h3>
                <RichText parts={chapter.title[language]} />
              </h3>
              <div className="overview-tables">
                {topics.map(({ node, table }) => (
                  <article key={node.id} className="panel">
                    <h4>
                      <Link to={`/node/${node.id}`}>
                        <RichText parts={node.title[language]} />
                      </Link>
                    </h4>
                    <GrammarTableView table={table} />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
      ))}
    </main>
  )
}

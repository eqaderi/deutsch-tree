import type { GrammarTable } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { German, RichText } from './German.tsx'

/**
 * A grammar table, on a topic's page and on the "all grammar at a glance"
 * page. A table wider than the screen scrolls sideways inside its own box.
 */
export function GrammarTableView({ table }: { table: GrammarTable }) {
  const { language } = useLanguage()
  return (
    <div className="table-scroll">
      {/* The rows are German, so the table reads left to right in every language. */}
      <table dir="ltr">
        <thead>
          <tr>
            {table.columns.map((column, index) => (
              <th key={index} scope="col">
                <bdi>
                  <RichText parts={column[language]} />
                </bdi>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  <German>{cell}</German>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

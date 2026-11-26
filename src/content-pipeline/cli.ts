/**
 * Runs the content pipeline from a terminal and prints the report.
 *
 *   node src/content-pipeline/cli.ts                  check the real content
 *   node src/content-pipeline/cli.ts --out <folder>   also write the compiled bundle
 *   node src/content-pipeline/cli.ts --content <folder>
 *
 * Exits with status 1 when the content has errors.
 */
import { parseArgs } from 'node:util'
import { compileContent, formatReport, writeBundle } from './index.ts'

const { values } = parseArgs({
  options: {
    content: { type: 'string', default: process.env.CONTENT_DIR ?? 'content' },
    out: { type: 'string' },
  },
})

const { report, bundle } = await compileContent(values.content)
console.log(formatReport(report))

if (bundle && values.out) {
  await writeBundle(bundle, values.out)
  console.log(`Bundle written to ${values.out}`)
}

process.exitCode = report.ok ? 0 : 1

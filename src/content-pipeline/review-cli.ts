/**
 * The blind review of a node's question pool, from a terminal.
 *
 *   node src/content-pipeline/review-cli.ts pool <node-id> [--out <sheet.json>] [--only q3,q7]
 *     Writes the review sheet: the pool without answers and explanations.
 *
 *   node src/content-pipeline/review-cli.ts record <node-id> --answers <sheet.json> --reviewer "<who>"
 *     Compares the filled-in sheet with the key. Lists every disagreement and
 *     exits with status 1, or stores the review record in the node file.
 *     --answers may be given several times; for a question in several sheets
 *     the last one counts. --date <YYYY-MM-DD> replaces today's date.
 *
 * Both take --content <folder>. Status 2 means the command could not run.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { blindPool, recordReview } from './review.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    content: { type: 'string', default: process.env.CONTENT_DIR ?? 'content' },
    out: { type: 'string' },
    only: { type: 'string' },
    answers: { type: 'string', multiple: true, default: [] },
    reviewer: { type: 'string' },
    date: { type: 'string', default: today() },
  },
})
const [command, nodeId] = positionals

try {
  if (command === 'pool' && nodeId) {
    await pool(nodeId)
  } else if (command === 'record' && nodeId && values.answers.length > 0 && values.reviewer) {
    await record(nodeId, values.answers, values.reviewer)
  } else {
    console.error(
      [
        'Usage:',
        '  pnpm review:pool <node-id> --out <sheet.json> [--only q3,q7]',
        '  pnpm review:record <node-id> --answers <sheet.json> --reviewer "<who answered it>"',
      ].join('\n'),
    )
    process.exitCode = 2
  }
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 2
}

async function pool(nodeId: string): Promise<void> {
  const sheet = await blindPool(values.content, nodeId, values.only?.split(','))
  const json = `${JSON.stringify(sheet, null, 2)}\n`
  if (!values.out) {
    process.stdout.write(json)
    return
  }
  await writeFile(values.out, json)
  console.log(`${sheet.questions.length} questions of ${nodeId} written to ${values.out}, without answers.`)
}

async function record(nodeId: string, sheetFiles: string[], reviewer: string): Promise<void> {
  const sheets: unknown[] = []
  for (const file of sheetFiles) {
    try {
      sheets.push(JSON.parse(await readFile(file, 'utf8')))
    } catch (error) {
      throw new Error(`Cannot read ${file} as JSON: ${(error as Error).message}`)
    }
  }

  const result = await recordReview(values.content, nodeId, sheets, { reviewer, date: values.date })
  if (result.record) {
    console.log(`Review of ${nodeId} recorded: ${result.record.reviewer}, ${result.record.date}.`)
    return
  }
  for (const { question, problem } of result.disagreements)
    console.log(`DISAGREEMENT ${nodeId} ${question}: ${problem}`)
  const count = result.disagreements.length
  console.log(
    `${count} disagreement${count === 1 ? '' : 's'}. Nothing was recorded. Fix the question or the key, then run this again.`,
  )
  process.exitCode = 1
}

function today(): string {
  const now = new Date()
  const two = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

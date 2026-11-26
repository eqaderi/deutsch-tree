import { execFile } from 'node:child_process'
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, test } from 'vitest'
import { fixtureBook, writeFixtureBook } from './fixture.ts'

const cli = fileURLToPath(new URL('../../src/pack-builder/cli.ts', import.meta.url))

/**
 * Runs the command from a temporary folder standing in for the project, so
 * the pack lands in that folder's `private/` and never in the repository's.
 */
async function run(args: string[]) {
  const project = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-project-'))
  const result = await promisify(execFile)(process.execPath, [cli, ...args], { cwd: project }).then(
    ({ stdout, stderr }) => ({ code: 0, output: stdout + stderr }),
    (error: { code: number; stdout: string; stderr: string }) => ({
      code: error.code,
      output: error.stdout + error.stderr,
    }),
  )
  return { ...result, project }
}

test('one command turns an exam PDF, an answer-key PDF and an audio folder into a pack in private/', async () => {
  const book = await writeFixtureBook(fixtureBook())

  const { code, output, project } = await run([
    '--exam',
    book.examPdf,
    '--key',
    book.answerKeyPdf,
    '--audio',
    book.audioDir,
    '--name',
    'Fixture book',
  ])

  expect(output).toContain('2 exams')
  // The repaired misprint is pointed out, so the learner can check it against the book.
  expect(output).toMatch(/Exam 2, Lesen Teil 2: item 9 is printed as 8/)
  expect(code).toBe(0)
  expect(await readdir(path.join(project, 'private'))).toEqual(['fixture-book'])
  expect((await readdir(path.join(project, 'private', 'fixture-book'))).sort()).toEqual([
    'answers.json',
    'exams',
    'pack.json',
  ])
  const description = JSON.parse(await readFile(path.join(project, 'private', 'fixture-book', 'pack.json'), 'utf8'))
  expect(description).toMatchObject({ name: 'Fixture book', examCount: 2 })
})

test('when the book does not add up, the command prints every problem, fails and writes nothing', async () => {
  const broken = fixtureBook()
  broken.recordings.push('Bonus track.mp3')
  broken.keyPages = broken.keyPages.slice(0, 1)
  const book = await writeFixtureBook(broken)

  const { code, output, project } = await run([
    '--exam',
    book.examPdf,
    '--key',
    book.answerKeyPdf,
    '--audio',
    book.audioDir,
    '--name',
    'Fixture book',
  ])

  expect(code).toBe(1)
  expect(output).toContain('No pack was written')
  expect(output).toContain('Exam 2: no heading for this exam in the answer key')
  expect(output).toContain('"Bonus track.mp3"')
  expect(await readdir(project)).toEqual([])
})

test("the command reads a book's profile from a file", async () => {
  const book = await writeFixtureBook(fixtureBook())
  const profile = path.join(book.dir, 'profile.yaml')
  await writeFile(profile, 'exams: 3\n')

  const { code, output } = await run([
    '--exam',
    book.examPdf,
    '--key',
    book.answerKeyPdf,
    '--audio',
    book.audioDir,
    '--name',
    'Fixture book',
    '--profile',
    profile,
  ])

  expect(code).toBe(1)
  expect(output).toContain('The profile says the book has 3 exams, but 2 exam headings were found')
})

test('the command explains itself when an input is missing', async () => {
  const { code, output } = await run(['--name', 'Fixture book'])

  expect(code).toBe(2)
  expect(output).toContain('--exam')
  expect(output).toContain('--key')
  expect(output).toContain('--audio')
})

/**
 * Builds a private pack from a learner's own exam book. Run once per book.
 *
 *   node src/pack-builder/cli.ts --exam <exams.pdf> --key <answer-key.pdf> --audio <folder> --name "<pack name>"
 *
 * Exits with status 1, and writes nothing, when the book's files do not add
 * up. docs/private-packs.md explains the options and the profile file.
 */
import { parseArgs } from 'node:util'
import { PACKS_FOLDER } from '../content-model/pack.ts'
import { buildPack, formatReport } from './index.ts'
import { readProfileFile } from './profile.ts'

const USAGE = `Builds a private pack from your own exam book.

  pnpm pack:build --exam <exams.pdf> --key <answer-key.pdf> --audio <folder> --name "<pack name>"

  --exam <file>      the book's exams as one PDF with a text layer (none needed with a layout)
  --key <file>       the book's answer key as a PDF with a text layer
  --audio <folder>   the folder with the book's recordings
  --name <text>      the pack's name, as the app shows it

  --profile <file>   what is special about this book (see docs/private-packs.md)
  --id <text>        the pack's folder name; default: the name in lower case with hyphens
  --out <folder>     where packs live; default: ${PACKS_FOLDER}
  --replace          replace a pack that already has this folder name`

function usage(problem: string): never {
  console.error(`${problem}\n\n${USAGE}`)
  process.exit(2)
}

const { values } = (() => {
  try {
    return parseArgs({
      options: {
        exam: { type: 'string' },
        key: { type: 'string' },
        audio: { type: 'string' },
        name: { type: 'string' },
        profile: { type: 'string' },
        id: { type: 'string' },
        out: { type: 'string', default: PACKS_FOLDER },
        replace: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
    })
  } catch (error) {
    return usage((error as Error).message)
  }
})()

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}

const { exam, key, audio, name } = values
if (!exam || !key || !audio || !name) {
  const missing = Object.entries({ exam, key, audio, name })
    .filter(([, value]) => !value)
    .map(([option]) => `--${option}`)
  usage(`Missing: ${missing.join(', ')}`)
}

const profile = values.profile
  ? await readProfileFile(values.profile).catch((error: Error) =>
      usage(`The profile ${values.profile} cannot be read: ${error.message}`),
    )
  : undefined

const { report, packDir } = await buildPack({
  examPdf: exam,
  answerKeyPdf: key,
  audioDir: audio,
  name,
  outDir: values.out,
  id: values.id,
  profile,
  replace: values.replace,
})

const text = formatReport(report, packDir)
if (report.ok) console.log(text)
else console.error(text)
process.exitCode = report.ok ? 0 : 1

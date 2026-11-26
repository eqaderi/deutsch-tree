/**
 * Generates the audio of the content: `pnpm audio:generate`.
 *
 *   pnpm audio:generate --voices <folder>        the real content, with Piper
 *   pnpm audio:generate --content <folder> ...   another content folder
 *   pnpm audio:generate --silent                 a silent file for each item (fixture content only)
 *   pnpm audio:generate ... --redo <key>,<key>   say these items again (a slip of the voice)
 *   pnpm audio:generate ... --force              say everything again (a voice model changed)
 *
 * `--voices` is the folder of the Piper voice files (`de_DE-thorsten-medium.onnx`
 * and its `.onnx.json`, the same for Kerstin), or the PIPER_VOICES variable.
 * `--piper` (or PIPER) is the piper command, `--ffmpeg` (or FFMPEG) the ffmpeg
 * command; both default to the name on the PATH.
 *
 * Only what is new or changed is said; a file that no content needs any more
 * is removed. Exits with status 1 when the content has errors.
 */
import path from 'node:path'
import { parseArgs } from 'node:util'
import { audioFile } from '../content-model/audio.ts'
import { formatErrors } from '../content-pipeline/index.ts'
import { generateAudio } from './generate.ts'
import { piperVoice, silentVoice } from './piper.ts'

const { values } = parseArgs({
  options: {
    content: { type: 'string', default: process.env.CONTENT_DIR ?? 'content' },
    voices: { type: 'string', default: process.env.PIPER_VOICES },
    piper: { type: 'string', default: process.env.PIPER ?? 'piper' },
    ffmpeg: { type: 'string', default: process.env.FFMPEG ?? 'ffmpeg' },
    silent: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    redo: { type: 'string' },
  },
})

if (!values.silent && !values.voices) {
  console.error('Name the folder of the Piper voice files: --voices <folder> (or PIPER_VOICES).')
  process.exit(1)
}
if (values.silent && path.resolve(values.content) === path.resolve('content')) {
  console.error('--silent is for fixture content; the real content is spoken with Piper.')
  process.exit(1)
}

const synthesise = values.silent
  ? silentVoice
  : piperVoice({ piper: values.piper, voices: values.voices as string, ffmpeg: values.ffmpeg })

const report = await generateAudio(values.content, synthesise, {
  force: values.force,
  redo: values.redo?.split(',').map((key) => key.trim()),
  onMade: (item, done, total) => console.log(`${done}/${total} ${audioFile(item.key)}  ${item.node}  "${item.text}"`),
})

if (report.errors.length > 0) {
  console.log(formatErrors(report.errors))
  process.exitCode = 1
} else {
  console.log(
    `Audio: ${report.made.length} made, ${report.kept.length} unchanged, ${report.removed.length} removed (${values.content}/audio).`,
  )
}

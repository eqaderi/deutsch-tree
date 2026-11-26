/**
 * The voice engines that `pnpm audio:generate` can use.
 *
 * `piperVoice` says a text with Piper and encodes it as the format chosen on
 * ticket #5: MP3, 48 kbit/s, mono. Piper and the voice models are installed
 * outside the repository; nothing of them is committed. The WAV that Piper
 * writes lives in a temporary folder and is deleted at once.
 *
 * `silentVoice` writes the same short silent MP3 for every text. It is for
 * the fixture content, whose files only have to exist and play.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { VOICES } from '../content-model/audio.ts'
import type { Synthesiser } from './generate.ts'

export interface PiperSetup {
  /** The `piper` command (from the `piper-tts` Python package). */
  piper: string
  /** The folder that holds `<model>.onnx` and `<model>.onnx.json` for each voice of `VOICES`. */
  voices: string
  /** The `ffmpeg` command. */
  ffmpeg: string
}

/** The MP3 options of ticket #5: 48 kbit/s constant, mono, no tags. */
const MP3_OPTIONS = ['-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', '-id3v2_version', '0', '-write_xing', '0']

export function piperVoice({ piper, voices, ffmpeg }: PiperSetup): Synthesiser {
  return async (item) => {
    const folder = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-audio-'))
    try {
      const wav = path.join(folder, 'said.wav')
      const mp3 = path.join(folder, 'said.mp3')
      const voice = VOICES[item.voice]
      const model = path.join(voices, `${voice.model}.onnx`)
      const speaker = voice.speaker === undefined ? [] : ['--speaker', String(voice.speaker)]
      await run(piper, ['--model', model, ...speaker, '--output-file', wav], item.text)
      await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', wav, ...MP3_OPTIONS, mp3])
      return await readFile(mp3)
    } finally {
      await rm(folder, { recursive: true, force: true })
    }
  }
}

/** A quarter of a second of silence as MP3 (16 kHz, 8 kbit/s): 324 bytes. */
const SILENT_MP3 =
  '//MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVV//MYxBcAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxC4AAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxEUAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxFwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxHMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxIoAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxKEAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxLgAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'

export const silentVoice: Synthesiser = async () => Buffer.from(SILENT_MP3, 'base64')

/** Runs a command with `input` on its standard input; rejects with its error output when it fails. */
function run(command: string, args: string[], input?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] })
    let errorOutput = ''
    child.stderr.on('data', (chunk) => {
      errorOutput += chunk
    })
    child.on('error', (error) => reject(new Error(`could not run ${command}: ${error.message}`)))
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} failed (exit ${code}):\n${errorOutput.trim()}`)),
    )
    child.stdin.end(input ?? '')
  })
}

/**
 * Matches the files in the audio folder to exam parts by their names.
 *
 * Every file must be accounted for: it matches the profile's file pattern and
 * lands on a part that exists, or it matches the ignore pattern. Every part
 * of the module with recordings must get at least one file.
 */
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { matches } from './patterns.ts'
import { type BookProfile, namedGroups } from './profile.ts'

export interface MatchedRecording {
  exam: number
  part: number
  /** The file's path inside the audio folder, with forward slashes. */
  source: string
}

export interface RecordingsResult {
  /** In exam, part and playing order. */
  matched: MatchedRecording[]
  errors: string[]
}

const inNameOrder = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

/** Every file under a folder, as paths with forward slashes, in name order. Hidden files are left out. */
async function filesIn(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort(inNameOrder)
}

export async function matchRecordings(
  audioDir: string,
  profile: BookProfile,
  examNumbers: number[],
): Promise<RecordingsResult> {
  const module = profile.modules.find((entry) => entry.recordings)
  if (!module) return { matched: [], errors: [] }

  let files: string[]
  try {
    files = await filesIn(audioDir)
  } catch (error) {
    return { matched: [], errors: [`The audio folder ${audioDir} cannot be read: ${(error as Error).message}`] }
  }

  const errors: string[] = []
  const partCount = module.parts.length
  const byTrack = namedGroups(profile.recordings.file).includes('track')
  const matched: MatchedRecording[] = []
  const tracks: Array<{ track: number; source: string }> = []

  for (const source of files) {
    const name = path.posix.basename(source)
    if (profile.recordings.ignore !== undefined && matches(profile.recordings.ignore, name).length > 0) continue
    const [match] = matches(profile.recordings.file, path.posix.basename(source, path.posix.extname(source)))
    if (!match) {
      errors.push(
        `"${source}" does not match the pattern for a recording's file name (${profile.recordings.file}) or the pattern for files to ignore`,
      )
      continue
    }
    if (byTrack) {
      tracks.push({ track: Number(match.named.track), source })
      continue
    }
    const exam = Number(match.named.exam)
    const part = Number(match.named.part)
    if (!examNumbers.includes(exam)) {
      errors.push(`"${source}" reads as exam ${exam}, ${module.title} Teil ${part}, but the exam PDF has no exam ${exam}`)
    } else if (!(part >= 1 && part <= partCount)) {
      errors.push(
        `"${source}" reads as exam ${exam}, ${module.title} Teil ${part}, but ${module.title} has parts 1 to ${partCount}`,
      )
    } else {
      matched.push({ exam, part, source })
    }
  }

  let complete = true
  if (byTrack) {
    // One recording per part: the tracks, in number order, are the parts in book order.
    tracks.sort((a, b) => a.track - b.track)
    tracks.forEach((entry, index) => {
      const previous = tracks[index - 1]
      if (previous?.track === entry.track) {
        errors.push(`"${previous.source}" and "${entry.source}" both read as track ${entry.track}`)
      }
    })
    const needed = examNumbers.length * partCount
    if (tracks.length !== needed) {
      complete = false
      errors.push(
        `Found ${tracks.length} recordings, but ${examNumbers.length} exams with ${partCount} ${module.title} parts each need ${needed}`,
      )
    } else {
      tracks.forEach((entry, index) => {
        matched.push({
          exam: examNumbers[Math.floor(index / partCount)] as number,
          part: (index % partCount) + 1,
          source: entry.source,
        })
      })
    }
  }

  if (complete) {
    for (const exam of examNumbers) {
      for (let part = 1; part <= partCount; part++) {
        if (!matched.some((entry) => entry.exam === exam && entry.part === part)) {
          errors.push(`Exam ${exam}, ${module.title} Teil ${part}: no recording found`)
        }
      }
    }
  }

  matched.sort((a, b) => a.exam - b.exam || a.part - b.part || inNameOrder(a.source, b.source))
  return { matched, errors }
}

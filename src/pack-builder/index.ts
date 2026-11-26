/**
 * Pack builder: a learner's own exam book (exam PDF, answer-key PDF, audio
 * folder) in, a pack folder out. It copies and rearranges the learner's
 * files; it never retypes, translates or publishes anything.
 *
 * The builder writes a pack only when everything adds up. Anything that does
 * not (an exam with a missing part, a recording that matches nothing, a part
 * whose answers do not match its items) is an error in the report, and
 * nothing is written. A wrong answer key that looks right is the worst
 * outcome, so there are no silent guesses.
 */
import { copyFile, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  PACK_ANSWER_KEY_FILE,
  PACK_DESCRIPTION_FILE,
  PACK_FORMAT,
  type PackAnswerKey,
  type PackAnswerRepair,
  type PackDescription,
  type PackExam,
  type PackRecording,
  type PageRange,
} from '../content-model/pack.ts'
import { itemsByPart, readAnswerKey } from './answer-key.ts'
import { type ExamOutline, outlineErrors, outlineOf } from './exam-pdf.ts'
import { readPdfText, splitPdf } from './pdf.ts'
import { type BookProfileOverrides, resolveProfile } from './profile.ts'
import { type MatchedRecording, matchRecordings } from './recordings.ts'

export interface PackBuildOptions {
  /** The book's exams as one PDF with a text layer. */
  examPdf: string
  /** The book's answer key as a PDF with a text layer. */
  answerKeyPdf: string
  /** The folder that holds the book's recordings. */
  audioDir: string
  /** The pack's name, as the app shows it. */
  name: string
  /** The folder that holds packs. The pack is written to a subfolder of it. */
  outDir: string
  /** The pack's folder name. Default: the name in lower case with hyphens. */
  id?: string
  /** What differs in this book from the defaults in profile.ts. */
  profile?: BookProfileOverrides
}

export type ProblemSource = 'profile' | 'exam-pdf' | 'answer-key' | 'recordings' | 'output'

export interface PackBuildProblem {
  /** Which input the problem is in. */
  source: ProblemSource
  message: string
}

/** A heading the builder recognised in the exam PDF, and the page it is on. */
export interface FoundHeading {
  exam: number
  /** Absent for the exam's own heading. */
  module?: string
  /** Absent for an exam's or a module's heading. */
  part?: number
  page: number
}

export interface PackBuildReport {
  ok: boolean
  errors: PackBuildProblem[]
  /** Every heading recognised in the exam PDF, in reading order, also when the build fails. */
  headings: FoundHeading[]
  /**
   * Places where the answer key prints a wrong item number. The answers are
   * right, because the key is read in order; check these against the book.
   */
  repairs: PackAnswerRepair[]
}

export interface PackBuildResult {
  report: PackBuildReport
  /** The finished pack folder, or null when there were errors. */
  packDir: string | null
}

function headingsOf(exams: ExamOutline[]): FoundHeading[] {
  return exams.flatMap((exam) => [
    { exam: exam.number, page: exam.page },
    ...exam.modules.flatMap((module) => [
      { exam: exam.number, module: module.profile.id, page: module.page },
      ...module.parts.map((part) => ({
        exam: exam.number,
        module: module.profile.id,
        part: part.number,
        page: part.page,
      })),
    ]),
  ])
}

// ---------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------

const two = (number: number) => String(number).padStart(2, '0')

/** Where a part's recordings go inside the pack: exams/01/hoeren-1.mp3, or -1-1, -1-2 when it has several. */
function placeRecordings(recordings: MatchedRecording[], moduleId: string): PackRecording[] {
  return recordings.map((recording, index) => {
    const ending = path.posix.extname(recording.source).toLowerCase()
    const turn = recordings.length > 1 ? `-${index + 1}` : ''
    return {
      file: `exams/${two(recording.exam)}/${moduleId}-${recording.part}${turn}${ending}`,
      source: recording.source,
    }
  })
}

/** The description's exams, from an outline that has passed outlineErrors. */
function describeExams(exams: ExamOutline[], lastPage: number, recordings: MatchedRecording[]): PackExam[] {
  return exams.map((exam, examIndex) => {
    const examLast = (exams[examIndex + 1]?.page ?? lastPage + 1) - 1
    const inExam = (range: PageRange): PageRange => ({
      first: range.first - exam.page + 1,
      last: range.last - exam.page + 1,
    })
    return {
      number: exam.number,
      pagesFile: `exams/${two(exam.number)}/pages.pdf`,
      pageCount: examLast - exam.page + 1,
      sourcePages: { first: exam.page, last: examLast },
      modules: exam.modules.map((module, moduleIndex) => {
        // A section ends on the page before the next heading. When two
        // headings share a page, that page belongs to both sections.
        const nextModule = exam.modules[moduleIndex + 1]?.page ?? examLast + 1
        const moduleLast = Math.max(module.page, nextModule - 1)
        const moduleRange = { first: module.page, last: moduleLast }
        const items = itemsByPart(module.profile)
        return {
          id: module.profile.id,
          title: module.profile.title,
          pages: inExam(moduleRange),
          sourcePages: moduleRange,
          parts: module.parts.map((part, partIndex) => {
            const nextPart = module.parts[partIndex + 1]?.page ?? moduleLast + 1
            const partRange = { first: part.page, last: Math.max(part.page, nextPart - 1) }
            return {
              number: part.number,
              pages: inExam(partRange),
              sourcePages: partRange,
              items: items[partIndex] ?? [],
              recordings: module.profile.recordings
                ? placeRecordings(
                    recordings.filter((entry) => entry.exam === exam.number && entry.part === part.number),
                    module.profile.id,
                  )
                : [],
            }
          }),
        }
      }),
    }
  })
}

function slug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(
    () => true,
    () => false,
  )
}

export async function buildPack(options: PackBuildOptions): Promise<PackBuildResult> {
  const errors: PackBuildProblem[] = []
  let headings: FoundHeading[] = []
  let repairs: PackAnswerRepair[] = []
  const failed = (): PackBuildResult => ({ report: { ok: false, errors, headings, repairs }, packDir: null })
  const problem = (source: ProblemSource, message: string) => errors.push({ source, message })

  const resolved = resolveProfile(options.profile)
  if (!resolved.profile) {
    for (const message of resolved.errors) problem('profile', message)
    return failed()
  }
  const profile = resolved.profile

  const id = options.id ?? slug(options.name)
  const packDir = path.join(options.outDir, id)

  const pages = await readPdfText(options.examPdf)
  const firstPage = profile.examPdf.firstPage
  const lastPage = Math.min(profile.examPdf.lastPage ?? pages.length, pages.length)
  const outline = outlineOf(pages, profile, firstPage, lastPage)
  headings = headingsOf(outline)
  for (const message of outlineErrors(outline, profile, firstPage, lastPage)) problem('exam-pdf', message)

  const key = readAnswerKey(
    await readPdfText(options.answerKeyPdf, profile.answerKey.columns),
    profile,
    outline.map((exam) => exam.number),
  )
  repairs = key.repairs
  for (const message of key.errors) problem('answer-key', message)

  const recordings = await matchRecordings(
    options.audioDir,
    profile,
    outline.map((exam) => exam.number),
  )
  for (const message of recordings.errors) problem('recordings', message)

  if (errors.length > 0) return failed()

  const description: PackDescription = {
    format: PACK_FORMAT,
    id,
    name: options.name,
    examCount: outline.length,
    exams: describeExams(outline, lastPage, recordings.matched),
  }
  const answerKey: PackAnswerKey = { format: PACK_FORMAT, exams: key.exams, repairs }

  // Written beside its final place and moved there when complete, so a pack
  // folder is never half-written.
  const building = path.join(options.outDir, `.${id}-building-${process.pid}`)
  await rm(building, { recursive: true, force: true })
  try {
    for (const exam of description.exams) {
      await mkdir(path.join(building, path.dirname(exam.pagesFile)), { recursive: true })
    }
    await splitPdf(
      options.examPdf,
      description.exams.map((exam) => ({ file: path.join(building, exam.pagesFile), ...exam.sourcePages })),
    )
    for (const recording of description.exams.flatMap((exam) =>
      exam.modules.flatMap((module) => module.parts.flatMap((part) => part.recordings)),
    )) {
      await copyFile(path.join(options.audioDir, recording.source), path.join(building, recording.file))
    }
    await writeFile(path.join(building, PACK_DESCRIPTION_FILE), `${JSON.stringify(description, null, 2)}\n`)
    await writeFile(path.join(building, PACK_ANSWER_KEY_FILE), `${JSON.stringify(answerKey, null, 2)}\n`)
    await rename(building, packDir)
  } finally {
    await rm(building, { recursive: true, force: true })
  }

  return { report: { ok: true, errors, headings, repairs }, packDir: (await exists(packDir)) ? packDir : null }
}

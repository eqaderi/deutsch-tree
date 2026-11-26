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
import { checkOutline, type ExamOutline, outlineOf } from './exam-pdf.ts'
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
  /** Replace a pack that already has this folder name. Default: refuse. */
  replace?: boolean
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
  /** The description of the pack that was written, or null when there were errors. */
  pack: PackDescription | null
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

/** The description's exams, from an outline that has passed checkOutline. */
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
  const failed = (): PackBuildResult => ({
    report: { ok: false, errors, headings, repairs, pack: null },
    packDir: null,
  })
  const problem = (source: ProblemSource, message: string) => errors.push({ source, message })

  const resolved = resolveProfile(options.profile)
  if (!resolved.profile) {
    for (const message of resolved.errors) problem('profile', message)
    return failed()
  }
  const profile = resolved.profile

  const id = options.id ?? slug(options.name)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    problem(
      'output',
      `"${id}" cannot be a pack's folder name. Give an id made of lower-case letters, digits and hyphens`,
    )
    return failed()
  }
  const packDir = path.join(options.outDir, id)
  if (!options.replace && (await exists(packDir))) {
    problem('output', `The pack folder ${packDir} already exists. Remove it, or build again with --replace`)
  }

  let pages: string[]
  try {
    pages = await readPdfText(options.examPdf, profile.examPdf.columns)
  } catch (error) {
    problem('exam-pdf', `${options.examPdf} cannot be read as a PDF: ${(error as Error).message}`)
    return failed()
  }
  if (pages.every((text) => text.trim() === '')) {
    problem('exam-pdf', 'The exam PDF has no text layer, so no heading can be found in it')
    return failed()
  }
  const firstPage = profile.examPdf.firstPage
  const lastPage = Math.min(profile.examPdf.lastPage ?? pages.length, pages.length)
  const outline = outlineOf(pages, profile, firstPage, lastPage)
  headings = headingsOf(outline)
  const check = checkOutline(outline, profile, firstPage, lastPage)
  for (const message of check.errors) problem('exam-pdf', message)
  // Without a sure list of exams there is nothing to hold the key and the recordings against.
  if (!check.examsAddUp) return failed()

  let keyPages: string[]
  try {
    keyPages = await readPdfText(options.answerKeyPdf, profile.answerKey.columns)
  } catch (error) {
    problem('answer-key', `${options.answerKeyPdf} cannot be read as a PDF: ${(error as Error).message}`)
    keyPages = []
  }
  const key = readAnswerKey(
    keyPages,
    profile,
    outline.map((exam) => exam.number),
  )
  repairs = key.repairs
  if (keyPages.length > 0) for (const message of key.errors) problem('answer-key', message)

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
    if (options.replace) await rm(packDir, { recursive: true, force: true })
    await rename(building, packDir)
  } catch (error) {
    problem('output', `The pack could not be written: ${(error as Error).message}`)
    return failed()
  } finally {
    await rm(building, { recursive: true, force: true })
  }

  return { report: { ok: true, errors, headings, repairs, pack: description }, packDir }
}

// ---------------------------------------------------------------------------
// The report as text
// ---------------------------------------------------------------------------

const SOURCE_TITLES: Record<ProblemSource, string> = {
  profile: 'Profile',
  'exam-pdf': 'Exam PDF',
  'answer-key': 'Answer key',
  recordings: 'Recordings',
  output: 'Pack folder',
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const pagesText = (range: PageRange) =>
  range.first === range.last ? `page ${range.first}` : `pages ${range.first} to ${range.last}`

/** What was found in a failed build: each exam's headings and the pages they are on. */
function headingLines(headings: FoundHeading[]): string[] {
  const lines: string[] = []
  for (const heading of headings) {
    if (heading.module === undefined) lines.push(`  Exam ${heading.exam} (page ${heading.page})`)
    else if (heading.part === undefined) lines.push(`    ${heading.module} (page ${heading.page})`)
    else lines[lines.length - 1] += `, Teil ${heading.part} (page ${heading.page})`
  }
  return lines
}

/** The report for a terminal: every problem, or what the pack holds and what to check by hand. */
export function formatReport(report: PackBuildReport, packDir: string | null): string {
  const lines: string[] = []
  if (!report.pack) {
    lines.push(`No pack was written. ${plural(report.errors.length, 'problem')}:`)
    for (const [source, title] of Object.entries(SOURCE_TITLES)) {
      const problems = report.errors.filter((error) => error.source === source)
      if (problems.length === 0) continue
      lines.push('', title)
      for (const error of problems) lines.push(`  - ${error.message}`)
    }
    if (report.headings.length > 0) {
      lines.push('', 'Headings found in the exam PDF:', ...headingLines(report.headings))
    }
    return lines.join('\n')
  }

  const parts = report.pack.exams.flatMap((exam) => exam.modules.flatMap((module) => module.parts))
  lines.push(
    `Pack "${report.pack.name}" written to ${packDir}`,
    [
      plural(report.pack.examCount, 'exam'),
      plural(
        report.pack.exams.reduce((sum, exam) => sum + exam.pageCount, 0),
        'page',
      ),
      plural(
        parts.reduce((sum, part) => sum + part.items.length, 0),
        'answer',
      ),
      plural(
        parts.reduce((sum, part) => sum + part.recordings.length, 0),
        'recording',
      ),
    ].join(', '),
    '',
    'Page numbers count the pages of the exam PDF from 1; the numbers printed in the book may differ.',
    'Check a few exams against the book.',
  )
  for (const exam of report.pack.exams) {
    lines.push(`Exam ${exam.number}: ${pagesText(exam.sourcePages)}`)
    for (const module of exam.modules) {
      lines.push(`  ${module.title}: ${pagesText(module.sourcePages)}`)
      for (const part of module.parts) {
        const items = `items ${part.items[0]?.number} to ${part.items.at(-1)?.number}`
        const recordings = part.recordings.map((recording) => recording.source).join(', ')
        lines.push(
          `    Teil ${part.number}: ${pagesText(part.sourcePages)}, ${items}${recordings ? `, ${recordings}` : ''}`,
        )
      }
    }
  }
  if (report.repairs.length > 0) {
    const titles = new Map(report.pack.exams.flatMap((exam) => exam.modules.map((module) => [module.id, module.title])))
    lines.push(
      '',
      'The answer key prints a wrong item number in these places. The answer is filed under the item',
      'it belongs to by its place in the key. Check each one against the book:',
    )
    for (const repair of report.repairs) {
      lines.push(
        `  Exam ${repair.exam}, ${titles.get(repair.module) ?? repair.module} Teil ${repair.part}: item ${repair.item} is printed as ${repair.printed}`,
      )
    }
  }
  return lines.join('\n')
}

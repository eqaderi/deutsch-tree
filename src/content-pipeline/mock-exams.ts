/**
 * The original mock exams: one file per exam in `mock-exams/`, beside the
 * `nodes` folder. Read, held against the schema and the formats of the exam
 * parts, reviewed like a node, and compiled for the app.
 *
 * A mock exam's Lesen and Hören parts are item tasks, the same as the
 * practice tasks of an exam-part node: the same schema, format check,
 * review and compiled shape. A part's id is its place ("lesen-3"), so an
 * item is named "lesen-3/i2" in a report and on a review sheet.
 *
 * Its Schreiben and Sprechen are tasks for an AI assistant, the same as the
 * task of a writing or speaking node. They have no key, so they are not on
 * the review sheet.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  EXAM_MODULE_FACTS,
  type ExamTask,
  type ItemTask,
  type ItemTaskFile,
  itemTaskFormat,
  type Localised,
  MOCK_EXAM_ASSISTANT_MODULES,
  MOCK_EXAM_ITEM_MODULES,
  type MockExam,
  type MockExamFile,
  type MockExamItemModule,
  type MockExamList,
  type MockExamSummary,
  mockExamFileSchema,
  type RichText,
} from '../content-model/index.ts'
import { unmarkedGerman } from './checks/german-in-persian-is-marked.ts'
import { type ContentProblem, formatPath } from './checks/index.ts'
import { itemTaskProblems } from './checks/practice-task-fits-its-part.ts'
import { reviewProblem } from './review.ts'

/** The folder of the mock exam files, inside the content folder; and the compiled files in the bundle. */
export const MOCK_EXAMS_FOLDER = 'mock-exams'
export const MOCK_EXAMS_JSON = 'mock-exams.json'

/** The parts of a mock exam as item tasks with their ids, Lesen then Hören: "lesen-1" to "hoeren-4". */
export function mockExamTasks(exam: MockExamFile): ItemTaskFile[] {
  return MOCK_EXAM_ITEM_MODULES.flatMap((module) => tasksOf(exam, module))
}

/** The parts of one module of a mock exam as item tasks, in order, each with its id: "lesen-1". */
function tasksOf(exam: MockExamFile, module: MockExamItemModule): ItemTaskFile[] {
  return (exam[module] ?? []).map((part, index) => ({ id: `${module}-${index + 1}`, ...part }))
}

/** A mock exam file that passed the schema. */
export interface CheckedMockExam {
  /** Path of the file, relative to the content folder. */
  file: string
  exam: MockExamFile
}

/**
 * Every mock exam file that passed the schema, in file order, with the
 * problems of all of them added to `errors`. No folder means no mock exams.
 */
export async function readMockExams(contentDir: string, errors: ContentProblem[]): Promise<CheckedMockExam[]> {
  const entries = await readdir(path.join(contentDir, MOCK_EXAMS_FOLDER)).catch(() => [] as string[])
  const checked: CheckedMockExam[] = []
  for (const entry of entries.filter((name) => name.endsWith('.yaml')).sort()) {
    const file = path.posix.join(MOCK_EXAMS_FOLDER, entry)
    const named = path.basename(entry, '.yaml')
    let raw: unknown
    try {
      raw = parseYaml(await readFile(path.join(contentDir, file), 'utf8'))
    } catch (error) {
      errors.push({ file, node: named, message: `is not valid YAML: ${(error as Error).message}` })
      continue
    }
    const parsed = mockExamFileSchema.safeParse(raw)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({ file, node: named, where: formatPath(issue.path), message: issue.message })
      }
      continue
    }
    const exam = parsed.data
    if (exam.id !== named) {
      errors.push({
        file,
        node: exam.id,
        where: 'id',
        message: `the file of mock exam "${exam.id}" must be named ${exam.id}.yaml`,
      })
      continue
    }
    // Compiled even with problems, as a node is, so that the report also names what its audio lacks.
    errors.push(...mockExamProblems({ file, exam }))
    checked.push({ file, exam })
  }
  return checked
}

/** What the schema of one file cannot say: ids, Persian, the formats of the parts, the review. */
function mockExamProblems({ file, exam }: CheckedMockExam): ContentProblem[] {
  const at = { file, node: exam.id }
  const problems: ContentProblem[] = []

  // Inside one part, no two texts and no two items share an id.
  for (const module of MOCK_EXAM_ITEM_MODULES) {
    ;(exam[module] ?? []).forEach((part, partIndex) => {
      for (const what of ['texts', 'items'] as const) {
        const ids: string[] = part[what].map((one) => one.id)
        ids.forEach((id, index) => {
          const first = ids.indexOf(id)
          if (first === index) return
          const place = `${module}[${partIndex}].${what}`
          problems.push({
            ...at,
            where: `${place}[${index}].id`,
            message: `duplicated ${what.slice(0, -1)} id: "${id}" is also the id of ${place}[${first}]`,
          })
        })
      }
    })
  }

  const persian: Array<{ where: string; text: string; question?: string }> = [
    { where: 'title.fa', text: exam.title.fa },
    ...MOCK_EXAM_ITEM_MODULES.flatMap((module) =>
      (exam[module] ?? []).flatMap((part, partIndex) =>
        part.items.map((item, index) => ({
          where: `${module}[${partIndex}].items[${index}].explanation.fa`,
          text: item.explanation.fa,
          question: `${module}-${partIndex + 1}/${item.id}`,
        })),
      ),
    ),
  ]
  for (const { where, text, question } of persian) {
    const message = unmarkedGerman(text)
    if (message) problems.push({ ...at, ...(question ? { question } : {}), where, message })
  }

  if (exam.status === 'published') {
    for (const module of MOCK_EXAM_ITEM_MODULES) {
      tasksOf(exam, module).forEach((task, index) => {
        const examPart = { module, part: index + 1 }
        const format = itemTaskFormat(examPart)
        if (!format) return
        for (const { where, message } of itemTaskProblems(task, examPart, format)) {
          problems.push({ ...at, where: `${module}[${index}].${where}`, message })
        }
      })
    }
  }

  const unreviewed = reviewProblem({ ...exam, practice: mockExamTasks(exam) }, 'mock exam')
  if (unreviewed) problems.push({ ...at, where: 'review', message: unreviewed })
  return problems
}

/**
 * A mock exam as the app gets it: what is taken, once it is published.
 * `compileTask` and `compileTitle` are the pipeline's own, so a part is
 * compiled exactly as a practice task is.
 */
export function compileMockExam(
  exam: MockExamFile,
  compileTask: (task: ItemTaskFile) => ItemTask,
  compileTitle: (title: Localised) => Localised<RichText>,
): MockExam {
  const content: MockExam['content'] =
    exam.status === 'published'
      ? {
          modules: [
            ...MOCK_EXAM_ITEM_MODULES.filter((module) => exam[module] !== undefined).map((module) => ({
              module,
              scoredBy: 'items' as const,
              minutes: EXAM_MODULE_FACTS[module].minutes,
              parts: tasksOf(exam, module).map((task, index) => {
                const plays = itemTaskFormat({ module, part: index + 1 })?.plays
                return {
                  part: index + 1,
                  task: compileTask(task),
                  ...(plays === undefined ? {} : { plays }),
                }
              }),
            })),
            ...MOCK_EXAM_ASSISTANT_MODULES.filter((module) => exam[module] !== undefined).map((module) => ({
              module,
              scoredBy: 'assistant' as const,
              minutes: EXAM_MODULE_FACTS[module].minutes,
              // The schema guarantees the fields of each part's task.
              parts: (exam[module] ?? []).map((task, index) => ({
                part: index + 1,
                task: { module, part: index + 1, ...task } as ExamTask,
              })),
            })),
          ],
        }
      : null
  return {
    id: exam.id,
    order: exam.order,
    status: exam.status,
    title: compileTitle(exam.title),
    modules: (content?.modules ?? []).map((module) => module.module),
    content,
  }
}

/** The list of mock exams that the app fetches first: everything but what is taken. */
export function mockExamList(exams: readonly MockExam[]): MockExamList {
  return { exams: exams.map(({ content: _content, ...summary }): MockExamSummary => summary) }
}

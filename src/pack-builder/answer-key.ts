/**
 * Reads the answer-key PDF's text into the pack's answer key.
 *
 * Answers are taken in the order they are printed, not by the number printed
 * beside them: the third answer under a part's heading belongs to the part's
 * third item. That is what repairs a numbering misprint. It is safe because
 * every part must have exactly as many answers as it has items, and every
 * answer must be one of its item's choices; anything else is an error.
 */
import type { PackAnswerKey, PackAnswerRepair, PackItem } from '../content-model/pack.ts'
import { matches } from './patterns.ts'
import type { BookProfile, ModuleProfile } from './profile.ts'

/** The items of each part of a module: numbered through the module from 1, with their choices. */
export function itemsByPart(module: ModuleProfile): PackItem[][] {
  let number = 0
  return module.parts.map((part) =>
    Array.from({ length: part.items }, (_, index) => {
      number += 1
      const turns = part.choices.every((entry) => Array.isArray(entry)) ? (part.choices as string[][]) : null
      const choices = turns ? (turns[index % turns.length] as string[]) : (part.choices as string[])
      return { number, choices }
    }),
  )
}

interface PrintedAnswer {
  /** The item number printed in the key. */
  printed: number
  /** The answer as printed. */
  token: string
}

type KeyEvent =
  | { kind: 'exam'; index: number; number: number }
  | { kind: 'module'; index: number; id: string }
  | { kind: 'part'; index: number; number: number }
  | ({ kind: 'answer'; index: number } & PrintedAnswer)

export interface AnswerKeyResult {
  exams: PackAnswerKey['exams']
  repairs: PackAnswerRepair[]
  errors: string[]
}

type KeyModule = PackAnswerKey['exams'][number]['modules'][number]

/**
 * @param pages the key's text, one string per page
 * @param examNumbers the exams found in the exam PDF
 */
export function readAnswerKey(pages: string[], profile: BookProfile, examNumbers: number[]): AnswerKeyResult {
  const key = profile.answerKey
  const scored = profile.modules.filter((module) => module.parts.length > 0)
  const text = pages.join('\n')
  if (text.trim() === '') {
    return { exams: [], repairs: [], errors: ['The answer-key PDF has no text layer, so no answer can be read'] }
  }

  const headings: Array<KeyEvent & { end: number }> = [
    ...matches(key.exam, text).map((match) => ({
      kind: 'exam' as const,
      index: match.index,
      end: match.end,
      number: Number(match.groups[0]),
    })),
    ...scored.flatMap((module) =>
      matches(key.modules[module.id] as string, text).map((match) => ({
        kind: 'module' as const,
        index: match.index,
        end: match.end,
        id: module.id,
      })),
    ),
    ...(key.part === null ? [] : matches(key.part, text)).map((match) => ({
      kind: 'part' as const,
      index: match.index,
      end: match.end,
      number: Number(match.groups[0]),
    })),
  ]
  // A heading is never read as an answer ("Teil 1" beside "a" is not item 1).
  let withoutHeadings = text
  for (const heading of headings) {
    withoutHeadings =
      withoutHeadings.slice(0, heading.index) +
      ' '.repeat(heading.end - heading.index) +
      withoutHeadings.slice(heading.end)
  }
  const events: KeyEvent[] = [
    ...headings,
    ...matches(key.item, withoutHeadings).map((match) => ({
      kind: 'answer' as const,
      index: match.index,
      printed: Number(match.groups[0]),
      token: match.groups[1] ?? '',
    })),
  ].sort((a, b) => a.index - b.index)

  // Answers in printed order, by exam, module and part. Part 0 holds answers
  // printed before any part heading (all of them when the key has none).
  const printed = new Map<string, PrintedAnswer[]>()
  const place = (exam: number, module: string, part: number) => `${exam}/${module}/${part}`
  const examsInKey: number[] = []
  let exam: number | undefined
  let module: string | undefined
  let part = 0
  for (const event of events) {
    if (event.kind === 'exam') {
      if (event.number === exam) continue
      exam = event.number
      if (!examsInKey.includes(exam)) examsInKey.push(exam)
      module = undefined
      part = 0
    } else if (event.kind === 'module') {
      if (exam === undefined || event.id === module) continue
      module = event.id
      part = 0
    } else if (event.kind === 'part') {
      if (module !== undefined) part = event.number
    } else if (exam !== undefined && module !== undefined) {
      const where = place(exam, module, part)
      printed.set(where, [...(printed.get(where) ?? []), { printed: event.printed, token: event.token }])
    }
  }

  const errors: string[] = []
  const repairs: PackAnswerRepair[] = []
  const substitutes = new Map(Object.entries(key.answers).map(([from, to]) => [from.toLowerCase(), to]))
  const numbers = (answers: PrintedAnswer[]) => answers.map((answer) => answer.printed).join(', ') || 'none'

  if (examsInKey.length === 0) {
    errors.push(`No exam heading found in the answer key. The pattern for an exam's heading there is ${key.exam}`)
    return { exams: [], repairs, errors }
  }
  for (const number of examsInKey) {
    if (!examNumbers.includes(number)) {
      errors.push(`The answer key has a heading for exam ${number}, but the exam PDF has no exam ${number}`)
    }
  }

  const exams: PackAnswerKey['exams'] = []
  for (const examNumber of examNumbers) {
    if (!examsInKey.includes(examNumber)) {
      errors.push(`Exam ${examNumber}: no heading for this exam in the answer key`)
      continue
    }
    const modules: KeyModule[] = []
    for (const moduleProfile of scored) {
      const items = itemsByPart(moduleProfile)
      const label = `Exam ${examNumber}, ${moduleProfile.title}`
      const loose = printed.get(place(examNumber, moduleProfile.id, 0)) ?? []
      let answersByPart: PrintedAnswer[][]

      if (key.part === null) {
        // No part headings in the key: the module's answers are cut into parts by item count.
        const total = items.flat().length
        if (loose.length !== total) {
          errors.push(
            `${label}: the key has ${loose.length} answers but the module has ${total} items. Printed numbers found: ${numbers(loose)}`,
          )
          continue
        }
        let taken = 0
        answersByPart = items.map((partItems) => {
          taken += partItems.length
          return loose.slice(taken - partItems.length, taken)
        })
      } else {
        if (loose.length > 0) {
          errors.push(
            `${label}: ${loose.length} answers are printed before the first part heading (printed numbers ${numbers(loose)})`,
          )
        }
        for (const where of printed.keys()) {
          const [inExam, inModule, inPart] = where.split('/')
          if (inExam === String(examNumber) && inModule === moduleProfile.id && Number(inPart) > items.length) {
            errors.push(`${label}: the key has answers under Teil ${inPart}, but the module has ${items.length} parts`)
          }
        }
        answersByPart = items.map((_, index) => printed.get(place(examNumber, moduleProfile.id, index + 1)) ?? [])
      }

      const parts: KeyModule['parts'] = []
      items.forEach((partItems, index) => {
        const partNumber = index + 1
        const found = answersByPart[index] ?? []
        const partLabel = `${label} Teil ${partNumber}`
        if (found.length !== partItems.length) {
          errors.push(
            `${partLabel}: the key has ${found.length} answers but the part has ${partItems.length} items. Printed numbers found: ${numbers(found)}`,
          )
          return
        }
        const answers = partItems.map((item, position) => {
          const { printed: printedNumber, token } = found[position] as PrintedAnswer
          const lower = token.trim().toLowerCase()
          const answer = substitutes.get(lower) ?? lower
          if (!item.choices.includes(answer)) {
            errors.push(
              `${partLabel}, item ${item.number}: the key says "${token}", which is not one of ${item.choices.join(', ')}`,
            )
          }
          if (printedNumber !== item.number) {
            repairs.push({
              exam: examNumber,
              module: moduleProfile.id,
              part: partNumber,
              item: item.number,
              printed: printedNumber,
            })
          }
          return { item: item.number, answer }
        })
        parts.push({ number: partNumber, answers })
      })
      modules.push({ id: moduleProfile.id, parts })
    }
    exams.push({ number: examNumber, modules })
  }

  return { exams, repairs, errors }
}

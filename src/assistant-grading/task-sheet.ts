/**
 * The task sheet: a task as the learner reads it, with the fixed wording of
 * its exam part (how long, what to mind) around the task's own text. All of
 * it is German, like the sheet in the exam. The fixed wording is our own; it
 * is not the wording of the official sheets.
 */
import type { ExamTask } from '../content-model/index.ts'
import { wordsAskedFor } from './criteria.ts'

export type TaskBlock =
  | { type: 'text'; text: string }
  /** What someone else wrote, which the learner replies to. */
  | { type: 'quote'; author: string; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }

export interface TaskSheet {
  /** The exam part, such as "Schreiben, Aufgabe 1". */
  title: string
  /** What the sheet says, in reading order. */
  blocks: TaskBlock[]
}

const text = (value: string): TaskBlock => ({ type: 'text', text: value })

/** The five slides of every presentation in Sprechen, Teil 2. */
const SLIDES = [
  'Stellen Sie Ihr Thema vor und sagen Sie, wie Ihre Präsentation aufgebaut ist.',
  'Erzählen Sie von Ihrer eigenen Situation oder von einem eigenen Erlebnis.',
  'Beschreiben Sie die Situation in Ihrem Heimatland und geben Sie Beispiele.',
  'Nennen Sie Vorteile und Nachteile, sagen Sie Ihre Meinung und geben Sie Beispiele.',
  'Beenden Sie Ihre Präsentation und danken Sie den Zuhörerinnen und Zuhörern.',
]

export function taskSheet(task: ExamTask): TaskSheet {
  if (task.module === 'schreiben') {
    const words = wordsAskedFor(task.part)
    const title = `Schreiben, Aufgabe ${task.part}`
    switch (task.part) {
      case 1:
        return {
          title,
          blocks: [
            text(task.situation),
            { type: 'list', ordered: false, items: task.points },
            text(
              `Schreiben Sie eine E-Mail mit ungefähr ${words} Wörtern. Gehen Sie auf alle drei Punkte ein. Denken Sie an eine Anrede, eine Einleitung, eine sinnvolle Reihenfolge der Punkte und einen Schluss mit Gruß.`,
            ),
          ],
        }
      case 2:
        return {
          title,
          blocks: [
            text(task.situation),
            { type: 'quote', ...task.opinion },
            text(`Schreiben Sie nun Ihre eigene Meinung zu diesem Thema, mit ungefähr ${words} Wörtern.`),
          ],
        }
      case 3:
        return {
          title,
          blocks: [
            text(task.situation),
            text(
              `Schreiben Sie eine E-Mail mit ungefähr ${words} Wörtern. Denken Sie an die Anrede und an den Gruß am Schluss.`,
            ),
          ],
        }
    }
  }

  switch (task.part) {
    case 1:
      return {
        title: 'Sprechen, Teil 1: Gemeinsam etwas planen',
        blocks: [
          text(task.situation),
          text(
            'Planen Sie das zusammen mit Ihrer Partnerin oder Ihrem Partner. Sprechen Sie über die Punkte unten und auch über eigene Ideen. Machen Sie Vorschläge, reagieren Sie auf die Vorschläge der anderen Person und entscheiden Sie am Ende gemeinsam. Sie haben ungefähr 3 Minuten Zeit.',
          ),
          { type: 'list', ordered: false, items: [...task.points, '…'] },
        ],
      }
    case 2:
      return {
        title: 'Sprechen, Teil 2: Ein Thema präsentieren',
        blocks: [
          text(`Ihr Thema: ${task.topic}`),
          text(
            'Halten Sie eine kurze Präsentation zu diesem Thema, ungefähr 3 Minuten lang. Folgen Sie dabei diesen fünf Folien:',
          ),
          { type: 'list', ordered: true, items: SLIDES },
        ],
      }
    case 3:
      return {
        title: 'Sprechen, Teil 3: Über ein Thema sprechen',
        blocks: [
          text(`Thema der Präsentation: ${task.topic}`),
          text(
            'Ihre Partnerin oder Ihr Partner hält eine kurze Präsentation zu diesem Thema. Danach sind Sie an der Reihe. Sie haben ungefähr 2 Minuten Zeit.',
          ),
          {
            type: 'list',
            ordered: true,
            items: [
              'Geben Sie eine Rückmeldung zur Präsentation: Was hat Ihnen gefallen? Was war neu oder interessant für Sie?',
              'Stellen Sie eine Frage zur Präsentation.',
              'Beantworten Sie dann die Fragen, die man Ihnen zu diesem Thema stellt.',
            ],
          },
        ],
      }
  }
}

/** The task sheet as plain text, for a prompt. */
export function sheetAsText(sheet: TaskSheet): string {
  const blocks = sheet.blocks.map((block) => {
    switch (block.type) {
      case 'text':
        return block.text
      case 'quote':
        return `${block.author}: ${block.text}`
      case 'list':
        return block.items.map((item, index) => `${block.ordered ? `${index + 1}.` : '-'} ${item}`).join('\n')
    }
  })
  return [sheet.title, ...blocks].join('\n\n')
}

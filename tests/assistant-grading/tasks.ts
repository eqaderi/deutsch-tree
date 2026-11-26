import type { ExamTask } from '../../src/content-model/index.ts'

/** Invented tasks, one per writing task and speaking part. Tests assert on these words. */
export const schreiben1: ExamTask = {
  module: 'schreiben',
  part: 1,
  situation: 'Sie waren am Samstag auf dem Fixture-Fest. Ihre Freundin Mira konnte nicht kommen.',
  points: ['Beschreiben Sie: Wie war das Fest?', 'Begründen Sie: Warum war es schön?', 'Schlagen Sie ein Treffen vor.'],
}

export const schreiben2: ExamTask = {
  module: 'schreiben',
  part: 2,
  situation: 'In einem Forum lesen Sie eine Diskussion zum Thema „Fixture-Arbeit zu Hause“.',
  opinion: { author: 'Tarek', text: 'Zu Hause arbeite ich ruhiger, aber die Kollegen fehlen mir.' },
}

export const schreiben3: ExamTask = {
  module: 'schreiben',
  part: 3,
  situation: 'Sie können morgen nicht zum Fixture-Kurs kommen. Schreiben Sie an Ihre Kursleiterin, Frau Brandt.',
}

export const sprechen1: ExamTask = {
  module: 'sprechen',
  part: 1,
  situation: 'Ihr Kurs macht am Ende ein Fixture-Fest. Sie organisieren es zu zweit.',
  points: ['Wann und wo feiern?', 'Was essen und trinken?', 'Wer bringt was mit?', 'Welches Programm?'],
}

export const sprechen2: ExamTask = { module: 'sprechen', part: 2, topic: 'Fixture-Einkaufen im Internet' }

export const sprechen3: ExamTask = { module: 'sprechen', part: 3, topic: 'Fixture-Sport im Verein' }

export const everyTask: ExamTask[] = [schreiben1, schreiben2, schreiben3, sprechen1, sprechen2, sprechen3]

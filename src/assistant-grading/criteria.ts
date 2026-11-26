/**
 * The official marking criteria of the Goethe-Zertifikat B1 for Schreiben and
 * Sprechen: the criteria of each task, the points of each band, and the
 * descriptor of each band.
 *
 * Source: Zertifikat B1, Modellsatz Erwachsene (Goethe-Institut, ÖSD,
 * Universität Freiburg), Prüferblätter: "Bewertungskriterien Schreiben",
 * "Schreiben – Bewertung", "Bewertungskriterien Sprechen", "Sprechen –
 * Bewertung".
 * https://www.goethe.de/pro/relaunch/prf/materialien/B1/b1_modellsatz_erwachsene.pdf
 *
 * Every German word here is an official term and stays as printed. Where the
 * official table gives several aspects of one criterion in separate cells
 * (for example Spektrum and Beherrschung), their descriptors are joined with
 * a semicolon, each after the name of its aspect where the cell alone would
 * not say what it is about. "Wie Aufgabe 1" is written out. Do not reword,
 * translate or "improve" any of it: a prompt is only as faithful as this
 * file.
 */
import type { ExamTask } from '../content-model/index.ts'

/** The five bands, best first. E is always worth 0 points. */
export const BANDS = ['A', 'B', 'C', 'D', 'E'] as const

export interface Criterion {
  /** The official name, as on the score sheet. */
  name: string
  /** What the criterion looks at, in the official terms. */
  aspects: string
  /** The points for bands A to E, as printed on the score sheet. No other value may be given. */
  points: readonly [number, number, number, number, number]
  /** The descriptors for bands A to E. A band the official table leaves empty is null. */
  descriptors: readonly [string, string, string, string, string | null]
}

export interface Marking {
  /** The criteria of this one task or part, in the order of the score sheet. */
  criteria: Criterion[]
  /** The most points the task or part can give: 40, 40, 20 in Schreiben; 28, 40, 16 in Sprechen. */
  maximum: number
  /**
   * Aussprache: rated once for the whole Sprechen module, on all three parts
   * together, and worth 16 of its 100 points. Absent for Schreiben.
   */
  pronunciation?: Criterion
}

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------

const NOT_ENOUGH_TEXT = 'Textumfang weniger als 50 % der geforderten Wortanzahl oder Thema verfehlt'
const TEXT_INADEQUATE = 'Text durchgängig unangemessen'

type Points = Criterion['points']

const writingFulfilment: Record<1 | 2 | 3, Omit<Criterion, 'points'>> = {
  1: {
    name: 'Erfüllung',
    aspects:
      'Inhalt, Umfang, Sprachfunktionen (z. B. jemanden einladen, Vorschlag machen ...); Textsorte; Register / Soziokulturelle Angemessenheit',
    descriptors: [
      'Alle 3 Sprachfunktionen inhaltlich und umfänglich angemessen behandelt; Textsorte durchgängig umgesetzt; situations- und partneradäquat',
      '2 Sprachfunktionen angemessen oder 1 angemessen und 2 teilweise; Textsorte erkennbar; noch weitgehend situations- und partneradäquat',
      '1 Sprachfunktion angemessen und 1 teilweise oder alle teilweise; Textsorte ansatzweise erkennbar; ansatzweise situations- und partneradäquat',
      '1 Sprachfunktion angemessen oder teilweise; Textsorte kaum erkennbar; nicht mehr situations- und partneradäquat',
      NOT_ENOUGH_TEXT,
    ],
  },
  2: {
    name: 'Erfüllung',
    aspects: 'Inhalt, Umfang, Meinungsäußerung; Register / Soziokulturelle Angemessenheit',
    descriptors: [
      'Meinungsäußerung inhaltlich und umfänglich angemessen; situations- und partneradäquat',
      'überwiegend angemessen; noch weitgehend situations- und partneradäquat',
      'teilweise angemessen; ansatzweise situations- und partneradäquat',
      'kaum angemessen; nicht mehr situations- und partneradäquat',
      NOT_ENOUGH_TEXT,
    ],
  },
  3: {
    name: 'Erfüllung',
    aspects: 'Mitteilung, Inhalt; Register / Soziokulturelle Angemessenheit',
    descriptors: [
      'Mitteilung inhaltlich und soziokulturell angemessen',
      'überwiegend angemessen',
      'stellenweise angemessen',
      'kaum angemessen',
      NOT_ENOUGH_TEXT,
    ],
  },
}

const writingCoherence: Omit<Criterion, 'points'> = {
  name: 'Kohärenz',
  aspects: 'Textaufbau (z. B. Einleitung, Schluss ...); Verknüpfung von Sätzen, Satzteilen',
  descriptors: [
    'Textaufbau durchgängig und effektiv; Verknüpfung angemessen',
    'Textaufbau überwiegend erkennbar; Verknüpfung überwiegend angemessen',
    'Textaufbau stellenweise erkennbar; Verknüpfung teilweise angemessen',
    'Textaufbau kaum erkennbar; Verknüpfung kaum angemessen',
    TEXT_INADEQUATE,
  ],
}

/** Range and control, as the table words them for Wortschatz and Strukturen in Schreiben. */
const writingRangeAndControl: Criterion['descriptors'] = [
  'Spektrum differenziert; vereinzelte Fehlgriffe beeinträchtigen das Verständnis nicht',
  'Spektrum überwiegend angemessen; mehrere Fehlgriffe beeinträchtigen das Verständnis nicht',
  'Spektrum teilweise angemessen oder begrenzt; mehrere Fehlgriffe beeinträchtigen das Verständnis teilweise',
  'Spektrum kaum vorhanden; mehrere Fehlgriffe beeinträchtigen das Verständnis erheblich',
  TEXT_INADEQUATE,
]

function writingMarking(part: 1 | 2 | 3): Marking {
  // Aufgabe 1 and 2: four criteria of 10 points. Aufgabe 3: 4 + 4 + 6 + 6.
  const tens: Points = [10, 7.5, 5, 2.5, 0]
  const fours: Points = [4, 3, 2, 1, 0]
  const sixes: Points = [6, 4.5, 3, 1.5, 0]
  const [content, language]: [Points, Points] = part === 3 ? [fours, sixes] : [tens, tens]
  return {
    criteria: [
      { ...writingFulfilment[part], points: content },
      { ...writingCoherence, points: content },
      { name: 'Wortschatz', aspects: 'Spektrum; Beherrschung', descriptors: writingRangeAndControl, points: language },
      {
        name: 'Strukturen',
        aspects: 'Spektrum; Beherrschung (Morphologie, Syntax, Orthografie)',
        descriptors: writingRangeAndControl,
        points: language,
      },
    ],
    maximum: part === 3 ? 20 : 40,
  }
}

// ---------------------------------------------------------------------------
// Sprechen
// ---------------------------------------------------------------------------

const UNINTELLIGIBLE = 'Äußerung größtenteils unverständlich'

const speakingVocabulary: Omit<Criterion, 'points'> = {
  name: 'Wortschatz',
  aspects: 'Register; Spektrum; Beherrschung',
  descriptors: [
    'situations- und partneradäquat; Spektrum differenziert; vereinzelte Fehlgriffe beeinträchtigen das Verständnis nicht',
    'noch weitgehend situations- und partneradäquat; Spektrum überwiegend angemessen; mehrere Fehlgriffe beeinträchtigen das Verständnis nicht',
    'ansatzweise situations- und partneradäquat; Spektrum teilweise angemessen oder begrenzt; mehrere Fehlgriffe beeinträchtigen das Verständnis teilweise',
    'nicht mehr situations- und partneradäquat; Spektrum kaum vorhanden; mehrere Fehlgriffe beeinträchtigen das Verständnis erheblich',
    UNINTELLIGIBLE,
  ],
}

const speakingStructures: Omit<Criterion, 'points'> = {
  name: 'Strukturen',
  aspects: 'Spektrum; Beherrschung (Morphologie, Syntax)',
  descriptors: [
    'Spektrum differenziert; vereinzelte Fehlgriffe stören nicht',
    'Spektrum überwiegend angemessen; mehrere Fehlgriffe stören nicht',
    'Spektrum teilweise angemessen oder begrenzt; mehrere Fehlgriffe stören teilweise',
    'Spektrum kaum vorhanden; mehrere Fehlgriffe stören erheblich',
    UNINTELLIGIBLE,
  ],
}

const pronunciation: Criterion = {
  name: 'Aussprache',
  aspects: 'Satzmelodie, Wortakzent, Einzelne Laute',
  points: [16, 12, 8, 4, 0],
  descriptors: [
    'Keine auffälligen Abweichungen',
    'Wahrnehmbare Abweichungen beeinträchtigen das Verständnis nicht',
    'Abweichungen beeinträchtigen das Verständnis stellenweise',
    'Abweichungen beeinträchtigen das Verständnis erheblich',
    'nicht mehr verständlich',
  ],
}

const speakingMarking: Record<1 | 2 | 3, Marking> = {
  1: {
    criteria: [
      {
        name: 'Erfüllung',
        aspects: 'Sprachfunktionen (Vorschlag, Zustimmung ...), Inhalt, Umfang',
        points: [8, 6, 4, 2, 0],
        descriptors: [
          'Sprachfunktionen in Inhalt und Umfang angemessen behandelt',
          'überwiegend angemessen',
          'teilweise angemessen',
          'kaum angemessen',
          'Gesprächsanteil nicht bewertbar',
        ],
      },
      {
        name: 'Interaktion',
        aspects: 'Das Gespräch beginnen, in Gang halten, beenden; Reaktionsfähigkeit',
        points: [4, 3, 2, 1, 0],
        descriptors: ['angemessen', 'überwiegend angemessen', 'teilweise angemessen', 'kaum angemessen', null],
      },
      { ...speakingVocabulary, points: [8, 6, 4, 2, 0] },
      { ...speakingStructures, points: [8, 6, 4, 2, 0] },
    ],
    maximum: 28,
    pronunciation,
  },
  2: {
    criteria: [
      {
        name: 'Erfüllung',
        aspects: 'Vollständigkeit, Inhalt, Umfang',
        points: [12, 9, 6, 3, 0],
        descriptors: [
          'Alle 5 Folien in Inhalt und Umfang angemessen behandelt',
          '3-4 Folien in Inhalt und Umfang angemessen behandelt',
          '2 Folien in Inhalt und Umfang angemessen behandelt oder alle Folien zu knapp',
          '1 Folie in Inhalt und Umfang angemessen behandelt',
          'Präsentation nicht bewertbar',
        ],
      },
      {
        name: 'Kohärenz',
        aspects: 'Verknüpfung von Sätzen und Satzteilen; nachvollziehbarer Gedankengang',
        points: [4, 3, 2, 1, 0],
        descriptors: ['angemessen', 'überwiegend angemessen', 'teilweise angemessen', 'kaum angemessen', null],
      },
      { ...speakingVocabulary, points: [12, 9, 6, 3, 0] },
      { ...speakingStructures, points: [12, 9, 6, 3, 0] },
    ],
    maximum: 40,
    pronunciation,
  },
  3: {
    criteria: [
      {
        name: 'Erfüllung',
        aspects: 'Sprachfunktionen (Rückmeldung, Frage stellen, beantworten), Inhalt, Umfang',
        points: [16, 12, 8, 4, 0],
        descriptors: [
          'Sprachfunktionen in Inhalt und Umfang angemessen behandelt',
          'überwiegend angemessen',
          'teilweise angemessen',
          'kaum angemessen',
          'nicht bewertbar',
        ],
      },
    ],
    maximum: 16,
    pronunciation,
  },
}

/** The official criteria of one writing task or speaking part. */
export function markingOf(task: Pick<ExamTask, 'module' | 'part'>): Marking {
  return task.module === 'schreiben' ? writingMarking(task.part) : speakingMarking[task.part]
}

/** How many words the task asks for ("circa"): 80, 80 and 40 in Schreiben. */
export function wordsAskedFor(part: 1 | 2 | 3): number {
  return part === 3 ? 40 : 80
}

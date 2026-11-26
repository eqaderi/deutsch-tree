import type { Strings } from './strings.ts'

/**
 * Simple German, at about A2 level: short main clauses, common words, and
 * "du" for the learner.
 */
export const de: Strings = {
  appName: 'deutsch-tree',
  language: 'Sprache',
  number: (value) => String(value),
  loading: 'Die Seite lädt …',
  loadFailed: 'Die Seite lädt nicht. Prüf bitte dein Internet und versuch es noch einmal.',
  tryAgain: 'Noch einmal versuchen',

  treeTitle: 'Deutsch von null bis B1',
  treeIntro:
    'Alles für die Goethe-Prüfung B1, als ein Baum mit kleinen Themen. Jedes Thema hat eine kurze Erklärung und einen Test.',
  levels: 'Niveaus',
  routeStart: 'Start',
  routeExam: 'Prüfung',
  levelNames: { A1: 'Anfänger', A2: 'Grundlagen', B1: 'Mittelstufe' },
  topicCount: (count) => (count === 1 ? '1 Thema' : `${count} Themen`),
  kinds: {
    grammar: 'Grammatik',
    vocabulary: 'Wortschatz',
    phrases: 'Redemittel',
    'exam-part': 'Prüfungsteile',
  },
  start: 'Start',
  comingSoon: 'Kommt bald',
  done: 'Fertig',

  allTopics: 'Alle Themen',
  rule: 'Regel',
  table: 'Tabelle',
  examples: 'Beispiele',
  commonMistakes: 'Häufige Fehler',
  wrong: 'Falsch',
  right: 'Richtig',
  test: 'Test',
  takeTheTest: 'Test machen',
  comingSoonPage: 'Dieses Thema ist noch nicht fertig. Es kommt später hierher.',
  notFoundTitle: 'Thema nicht gefunden',
  notFoundText: 'Unter dieser Adresse gibt es kein Thema.',

  backToTopic: 'Zurück zum Thema',
  testTitle: (title) => `Test: ${title}`,
  questionOf: (place, total) => `Frage ${place} von ${total}`,
  questionNumber: (place) => `Frage ${place}`,
  instructions: {
    'multiple-choice': 'Wähle die richtige Antwort.',
    'gap-fill': 'Welches Wort passt in die Lücke?',
    'true-false': 'Ist dieser Satz richtiges Deutsch?',
  },
  gap: 'Lücke',
  sentenceCorrect: 'Richtig',
  sentenceNotCorrect: 'Falsch',
  next: 'Weiter',
  checkAnswers: 'Antworten prüfen',
  reportProblem: 'Problem melden',

  passed: 'Bestanden',
  notPassed: 'Noch nicht bestanden',
  ofTotalRight: (total) => `von ${total} richtig`,
  neededToPass: (passMark, total) => `Du brauchst ${passMark} richtige Antworten von ${total}.`,
  topicNowDone: 'Dieses Thema ist jetzt fertig.',
  topicStaysDone: 'Dieses Thema war schon fertig. Es bleibt fertig.',
  retryAnyTime: 'Du kannst es so oft versuchen, wie du willst. Jeder Test hat neue Fragen.',
  wrongAnswers: 'Falsche Antworten',
  yourAnswer: 'Deine Antwort',
  rightAnswer: 'Richtige Antwort',

  readiness: 'Bereit für die Prüfung',
  readinessTitle: 'Bist du bereit für die Prüfung?',
  readinessRule: (score, exams) =>
    `Du bist bereit, wenn du in ${exams} offiziellen Modellprüfungen in jedem Modul ${score} Punkte oder mehr hast.`,
  ready: 'Bereit',
  readyText: (score, exams) =>
    `Du hast in ${exams} offiziellen Modellprüfungen in jedem Modul ${score} Punkte oder mehr. Du kannst die Prüfung buchen.`,
  notReady: 'Noch nicht bereit',
  ofExamsAtTarget: (needed, score) =>
    `von ${needed} offiziellen Modellprüfungen mit ${score} Punkten oder mehr in jedem Modul`,
  whatIsMissing: 'Das fehlt noch',
  examsStillNeeded: (count, score) =>
    count === 1
      ? `Noch 1 offizielle Modellprüfung mit ${score} Punkten oder mehr in jedem Modul`
      : `Noch ${count} offizielle Modellprüfungen mit ${score} Punkten oder mehr in jedem Modul`,
  moduleBelow: (module, score, target) => `${module}: ${score}, du brauchst ${target}.`,
  moduleNotRecorded: (module) => `${module}: noch nicht eingetragen.`,
  examModules: {
    reading: 'Lesen',
    listening: 'Hören',
    writing: 'Schreiben',
    speaking: 'Sprechen',
  },

  examStopTitle: 'Die Prüfung',
  examStopWarning: 'Sieh dir die offiziellen Modellprüfungen erst bei deinem letzten Test an.',
  openReadiness: 'Bereit für die Prüfung und offizielle Modellprüfungen',

  keepUnseenTitle: 'Sieh dir diese Prüfungen noch nicht an',
  keepUnseenText:
    'Es gibt nur wenige offizielle Modellprüfungen, und du brauchst zwei. Eine Prüfung testet dich nur beim ersten Mal. Öffne keine davon, auch nicht kurz, bevor du mit den Themen und den Modellprüfungen von dieser Seite fertig bist.',
  keepUnseenThen: 'Mach dann jede Prüfung einmal, mit Uhr, wie die echte Prüfung. Trag danach deine Punkte hier ein.',

  officialMockExams: 'Offizielle Modellprüfungen',
  officialMockExamsIntro:
    'Das sind die Übungsprüfungen vom Institut der Prüfung. Diese Seite hat nur Links zu ihnen. Jeder Link öffnet eine andere Website.',
  spareSets: 'Reserve',
  spareSetsIntro:
    'Prüfungen für Jugendliche. Die Aufgaben und die Punkte sind wie bei Erwachsenen. Die Themen kommen aus der Schule. Nimm eine nur, wenn eine Prüfung für Erwachsene schon verbraucht ist.',
  examAudiences: { adults: 'Erwachsene', youth: 'Jugendliche' },
  spareCounts: 'Zählt für „bereit“ wie eine Prüfung für Erwachsene.',
  doesNotCount: 'Die Punkte von dieser Prüfung zählen nicht für „bereit“.',

  examNotRecorded: 'Noch keine Punkte eingetragen',
  examAtTarget: (score) => `Ziel erreicht: ${score} Punkte oder mehr in jedem Modul`,
  examBelowTarget: 'Ziel noch nicht erreicht',
  scoreNotRecorded: 'nicht eingetragen',
  recordScores: 'Punkte eintragen',
  changeScores: 'Punkte ändern',
  scoreHint: (maximum) =>
    `Punkte von ${maximum} für jedes Modul. Lass ein Feld leer, wenn du das Modul noch nicht gemacht hast.`,
  scoreInvalid: (maximum) => `Schreib eine ganze Zahl von 0 bis ${maximum}.`,
  saveScores: 'Punkte speichern',
  cancel: 'Abbrechen',

  showExamLinks: 'Links zu dieser Prüfung zeigen',
  hideExamLinks: 'Links nicht mehr zeigen',
  finalCheckQuestion: 'Ist das dein letzter Test vor der Prüfung?',
  finalCheckText:
    'Du kannst diese Prüfung nur einmal zum ersten Mal sehen. Öffne sie erst, wenn du sie als letzten Test machen willst.',
  finalCheckYes: 'Ja, Links zeigen',
  finalCheckNotYet: 'Noch nicht',
  examLinkKinds: {
    papers: 'Prüfungsblätter (PDF)',
    audio: 'Hörtexte',
    online: 'Online-Version',
  },
  candidatePagesOnly: (first, last) =>
    `Benutz nur die Seiten ${first} bis ${last}. Auf den Seiten danach stehen die Lösungen, die Hörtexte zum Lesen und Beispiele für gute Antworten.`,
}

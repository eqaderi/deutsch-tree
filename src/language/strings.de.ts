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
  continueTopic: 'Weiter',

  howItWorks: 'So geht es',
  firstSteps: {
    pick: 'Wähl ein Thema.',
    read: 'Lies es oder mach gleich den Test.',
    pass: (percent) => `Mit ${percent} % ist das Thema fertig.`,
  },
  gotIt: 'Verstanden',
  yourNextTopic: 'Dein nächstes Thema',
  nothingNext: 'Du hast alle Themen gemacht, die schon fertig sind. Neue Themen kommen später in den Baum.',
  youAreHere: 'Du bist hier',
  kindsOfTopic: 'Arten von Themen',
  allKinds: 'Alle Arten',
  doneCount: (done) => `${done} fertig`,
  leftCount: (left) => `${left} offen`,
  countsSummary: (done, left, comingSoon) =>
    comingSoon === 0
      ? `${done} fertig · ${left} offen`
      : `${done} fertig · ${left} offen, davon ${comingSoon === 1 ? 'kommt 1' : `kommen ${comingSoon}`} bald`,
  doneOfTotal: (done, total) => `${done} von ${total} fertig`,
  comingSoonCount: (count) => (count === 1 ? '1 kommt bald' : `${count} kommen bald`),
  noTopicsHere: 'In diesem Niveau gibt es keine Themen von dieser Art.',

  buildsOn: 'Diese Themen kommen vorher',
  buildsOnNote: 'Kein Thema ist gesperrt. Diese Themen helfen dir, wenn dieses Thema zu schwer ist.',
  unmark: 'Als nicht fertig markieren',
  unmarkQuestion: 'Soll dieses Thema nicht mehr fertig sein? Dann musst du es noch einmal bestehen.',
  unmarkConfirm: 'Ja, nicht mehr fertig',
  keepDone: 'Es bleibt fertig',
  unmarked: 'Dieses Thema ist nicht mehr fertig.',

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
}

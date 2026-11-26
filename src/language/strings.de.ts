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
  questionsInPool: (count) => (count === 1 ? 'Frage im Pool' : 'Fragen im Pool'),
  testNotReady: 'Tests gibt es noch nicht. Wir bauen sie gerade.',
}

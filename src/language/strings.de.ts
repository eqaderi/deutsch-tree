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

  task: 'Aufgabe',
  getYourScore: 'So bekommst du deine Punkte',
  writingSteps: [
    'Schreib deinen Text zu dieser Aufgabe, wie in der Prüfung: ohne Wörterbuch und ohne Übersetzer.',
    'Kopiere den Prompt und füge ihn in einen KI-Assistenten ein, zum Beispiel ChatGPT, Claude oder Gemini. Setz deinen Text darunter und schick beides ab.',
    'Der Assistent bewertet deinen Text mit den offiziellen Kriterien der Prüfung. Schreib seine Punktzahl unten in das Feld.',
  ],
  speakingSteps: [
    'Kopiere den Prompt und füge ihn in einen KI-Assistenten ein, der sprechen kann, zum Beispiel ChatGPT, Claude oder Gemini. Schick ihn ab.',
    'Schalte beim Assistenten den Sprachmodus ein und sag „Hallo“. Er spricht Deutsch mit dir, wie in der Prüfung. Sprich; schreib nicht.',
    'Am Ende bewertet dich der Assistent mit den offiziellen Kriterien der Prüfung. Schreib seine Punktzahl unten in das Feld.',
  ],
  copyPrompt: 'Prompt kopieren',
  promptCopied: 'Kopiert. Füge ihn jetzt in deinen KI-Assistenten ein.',
  promptNotCopied: 'Dein Browser erlaubt das Kopieren nicht. Markiere den ganzen Prompt unten und kopiere ihn selbst.',
  readPrompt: 'Prompt lesen',
  thePrompt: 'Der Prompt',
  promptNote:
    'Der Prompt ist auf Englisch und Deutsch. So versteht ihn der Assistent am besten. Der Assistent soll streng bewerten und dir in einfachem Deutsch antworten. Diese App schickt nichts ins Internet. Sie kopiert nur den Text.',
  pronunciationNote:
    '16 von 100 Punkten sind für die Aussprache. Ein Assistent kann die Aussprache nur ungefähr bewerten. Dieser Teil der Punktzahl ist also nicht genau.',
  yourScore: 'Deine Punktzahl',
  noScoreYet: 'Du hast noch keine Punktzahl.',
  scoreLabel: 'Punktzahl vom Assistenten, von 0 bis 100',
  saveScore: 'Punktzahl speichern',
  scoreNotValid: 'Schreib eine ganze Zahl von 0 bis 100.',
  ofTotal: (total) => `von ${total}`,
  scoreNeeded: (needed, total) => `Du brauchst ${needed} von ${total} Punkten. Dann ist das Thema fertig.`,
  scoreRetry:
    'Mach die Aufgabe noch einmal und schreib die neue Punktzahl hier hin. Du kannst es so oft versuchen, wie du willst.',
  scoresSoFar: 'Deine Punktzahlen bis jetzt',
}

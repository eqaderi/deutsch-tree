import { expect, test } from 'vitest'
import { checkAnswer, checkTyped, rightAnswer, scoreAttempt } from '../../src/learning-engine/index.ts'
import { gapFill, multipleChoice, trueFalse, typedAnswer, typedGapFill } from './questions.ts'

test('a typed answer is right when it is the accepted answer, and wrong when it is another word', () => {
  const question = typedAnswer('q1', ['wohnst'])

  expect(checkAnswer(question, 'wohnst')).toEqual({ correct: true, notes: [], accepted: 'wohnst' })
  expect(checkAnswer(question, 'wohnt')).toEqual({ correct: false, notes: [] })
})

// ---------- spaces ----------

test('spaces before and after a typed answer are ignored, with no note', () => {
  const question = typedAnswer('q1', ['wohnst'])

  expect(checkAnswer(question, '  wohnst ')).toEqual({ correct: true, notes: [], accepted: 'wohnst' })
  expect(checkAnswer(question, '\twohnst\n')).toEqual({ correct: true, notes: [], accepted: 'wohnst' })
})

test('several spaces between two words count as one, with no note', () => {
  const question = typedAnswer('q1', ['Ich wohne hier.'])

  expect(checkAnswer(question, 'Ich   wohne  hier.')).toEqual({ correct: true, notes: [], accepted: 'Ich wohne hier.' })
  // A space that a phone keyboard writes differently is a space all the same.
  expect(checkAnswer(question, 'Ich wohne hier.')).toMatchObject({ correct: true, notes: [] })
})

test('a missing space between two words is a wrong answer', () => {
  expect(checkAnswer(typedAnswer('q1', ['Ich wohne hier.']), 'Ichwohne hier.')).toEqual({ correct: false, notes: [] })
})

test('only spaces, or nothing, is a wrong answer', () => {
  const question = typedAnswer('q1', ['wohnst'])

  expect(checkAnswer(question, '   ').correct).toBe(false)
  expect(checkAnswer(question, '').correct).toBe(false)
  expect(checkAnswer(question, undefined).correct).toBe(false)
})

// ---------- ae, oe, ue and ss in place of ä, ö, ü and ß ----------

test.each([
  ['ae', 'ä', 'Maedchen', 'Mädchen'],
  ['oe', 'ö', 'schoen', 'schön'],
  ['ue', 'ü', 'muede', 'müde'],
  ['ss', 'ß', 'Fussball', 'Fußball'],
])('%s in place of %s is accepted with a note', (_substitute, _letter, typed, exact) => {
  expect(checkAnswer(typedAnswer('q1', [exact]), typed)).toEqual({
    correct: true,
    notes: ['umlaut-substitute'],
    accepted: exact,
  })
})

test('an answer written with its umlauts and its ß gets no note', () => {
  expect(checkAnswer(typedAnswer('q1', ['Die Mädchen spielen Fußball.']), 'Die Mädchen spielen Fußball.')).toEqual({
    correct: true,
    notes: [],
    accepted: 'Die Mädchen spielen Fußball.',
  })
})

test('a substitute is accepted at each place of an answer, also next to a letter that is written exactly', () => {
  const question = typedAnswer('q1', ['Die Füße der Mädchen sind müde.'])

  expect(checkAnswer(question, 'Die Fuesse der Mädchen sind muede.')).toEqual({
    correct: true,
    notes: ['umlaut-substitute'],
    accepted: 'Die Füße der Mädchen sind müde.',
  })
})

test.each([
  ['Aerzte', 'Ärzte'],
  ['Oel', 'Öl'],
  ['Uebung', 'Übung'],
])('%s in place of %s: a substitute for a capital umlaut keeps the capital', (typed, exact) => {
  expect(checkAnswer(typedAnswer('q1', [exact]), typed)).toEqual({
    correct: true,
    notes: ['umlaut-substitute'],
    accepted: exact,
  })
})

test.each([
  ['schon', 'schön'],
  ['Mutter', 'Mütter'],
  ['Fusball', 'Fußball'],
  ['Fuball', 'Fußball'],
])('%s for %s is wrong: the plain letter is not a substitute', (typed, exact) => {
  expect(checkAnswer(typedAnswer('q1', [exact]), typed)).toEqual({ correct: false, notes: [] })
})

test.each([
  ['neü', 'neue'],
  ['Waßer', 'Wasser'],
  ['daß', 'dass'],
])('%s for %s is wrong: an umlaut or ß does not stand for two plain letters', (typed, exact) => {
  expect(checkAnswer(typedAnswer('q1', [exact]), typed)).toEqual({ correct: false, notes: [] })
})

test('an umlaut that a keyboard writes as a letter and a separate pair of dots is the same umlaut', () => {
  const dotsApart = 'scho\u0308n'

  expect(checkAnswer(typedAnswer('q1', ['schön']), dotsApart)).toEqual({ correct: true, notes: [], accepted: 'schön' })
})

// ---------- capital and small letters ----------

test.each([
  ['berlin', 'Berlin'],
  ['Wohnst', 'wohnst'],
  ['ich wohne in berlin.', 'Ich wohne in Berlin.'],
  ['ICH WOHNE IN BERLIN.', 'Ich wohne in Berlin.'],
  ['MÄDCHEN', 'Mädchen'],
  ['ärzte', 'Ärzte'],
])('%s for %s: a capitalisation difference is accepted with a note', (typed, exact) => {
  expect(checkAnswer(typedAnswer('q1', [exact]), typed)).toEqual({
    correct: true,
    notes: ['capitalisation'],
    accepted: exact,
  })
})

test.each([
  ['fussball', 'Fußball'],
  ['FUSSBALL', 'Fußball'],
  ['aerzte', 'Ärzte'],
  ['AERZTE', 'Ärzte'],
  ['die maedchen', 'Die Mädchen'],
])('%s for %s: a substitute and a capitalisation difference together get both notes', (typed, exact) => {
  expect(checkAnswer(typedAnswer('q1', [exact]), typed)).toEqual({
    correct: true,
    notes: ['umlaut-substitute', 'capitalisation'],
    accepted: exact,
  })
})

test('a wrong word stays wrong whatever its capitals', () => {
  expect(checkAnswer(typedAnswer('q1', ['Berlin']), 'bern')).toEqual({ correct: false, notes: [] })
})

// ---------- every accepted answer ----------

test('every answer that a question lists as accepted is right, and the check says which one was given', () => {
  const accepted = ['Ich wohne seit 2020 hier.', 'Seit 2020 wohne ich hier.', 'Hier wohne ich seit 2020.']
  const question = typedAnswer('q1', accepted)

  for (const answer of accepted) {
    expect(checkAnswer(question, answer)).toEqual({ correct: true, notes: [], accepted: answer })
  }
  expect(checkAnswer(question, 'Ich wohne hier seit 2020.')).toEqual({ correct: false, notes: [] })
})

test('an answer that is one accepted answer exactly gets no note, although it is another one with a slip', () => {
  const question = typedAnswer('q1', ['Sie', 'sie'])

  expect(checkAnswer(question, 'sie')).toEqual({ correct: true, notes: [], accepted: 'sie' })
  expect(checkAnswer(question, 'Sie')).toEqual({ correct: true, notes: [], accepted: 'Sie' })
  expect(checkAnswer(question, 'SIE')).toMatchObject({ correct: true, notes: ['capitalisation'] })
})

test('the tolerant rules hold for each accepted answer, not only the first', () => {
  const question = typedAnswer('q1', ['das Auto', 'der Wagen', 'die Straßenbahn'])

  expect(checkAnswer(question, ' die  strassenbahn ')).toEqual({
    correct: true,
    notes: ['umlaut-substitute', 'capitalisation'],
    accepted: 'die Straßenbahn',
  })
})

test('an accepted answer may itself be written with doubled spaces: the comparison ignores them too', () => {
  expect(checkTyped('das Auto', ['das  Auto '])).toMatchObject({ correct: true, notes: [] })
})

// ---------- the other places a typed answer is checked ----------

test('a typed gap fill answer is checked by the same rules', () => {
  const question = typedGapFill('q1', ['heißt', 'ist'])

  expect(checkAnswer(question, 'heißt')).toEqual({ correct: true, notes: [], accepted: 'heißt' })
  expect(checkAnswer(question, ' ist ')).toEqual({ correct: true, notes: [], accepted: 'ist' })
  expect(checkAnswer(question, 'Heisst')).toEqual({
    correct: true,
    notes: ['umlaut-substitute', 'capitalisation'],
    accepted: 'heißt',
  })
  expect(checkAnswer(question, 'heist')).toEqual({ correct: false, notes: [] })
  expect(checkAnswer(question, undefined)).toEqual({ correct: false, notes: [] })
})

test('an answer that is not text is a wrong answer to a typed question', () => {
  expect(checkAnswer(typedAnswer('q1', ['true']), true)).toEqual({ correct: false, notes: [] })
})

test('typed text can be checked against any list of accepted answers, so a missing or wrong article is wrong', () => {
  expect(checkTyped('der tisch', ['der Tisch'])).toEqual({
    correct: true,
    notes: ['capitalisation'],
    accepted: 'der Tisch',
  })
  expect(checkTyped('Tisch', ['der Tisch'])).toEqual({ correct: false, notes: [] })
  expect(checkTyped('die Tisch', ['der Tisch'])).toEqual({ correct: false, notes: [] })
})

test('a choice is right or wrong with no note', () => {
  const question = multipleChoice('q1', 'wohne', ['wohnst'])

  expect(checkAnswer(question, 'wohne')).toEqual({ correct: true, notes: [] })
  expect(checkAnswer(question, 'Wohne')).toEqual({ correct: false, notes: [] })
})

test('the result of an attempt counts an answer accepted with a note as right and keeps the note', () => {
  const attempt = [typedAnswer('a', ['Fußball']), typedGapFill('b', ['wohnst']), typedAnswer('c', ['Berlin'])]

  const result = scoreAttempt(attempt, ['fussball', 'wohnst', 'Bern'])

  expect(result).toMatchObject({ total: 3, correct: 2 })
  expect(result.questions).toEqual([
    {
      question: attempt[0],
      answer: 'fussball',
      correct: true,
      notes: ['umlaut-substitute', 'capitalisation'],
      accepted: 'Fußball',
    },
    { question: attempt[1], answer: 'wohnst', correct: true, notes: [], accepted: 'wohnst' },
    { question: attempt[2], answer: 'Bern', correct: false, notes: [] },
  ])
})

test('the right answer that a result shows is the stated one, or the first of the accepted answers', () => {
  expect(rightAnswer(multipleChoice('q1', 'wohne', ['wohnst']))).toBe('wohne')
  expect(rightAnswer(gapFill('q2', 'wohnst', ['wohne']))).toBe('wohnst')
  expect(rightAnswer(trueFalse('q3', false))).toBe(false)
  expect(rightAnswer(typedAnswer('q4', ['die Äpfel', 'Äpfel']))).toBe('die Äpfel')
  expect(rightAnswer(typedGapFill('q5', ['lernen', 'üben']))).toBe('lernen')
})

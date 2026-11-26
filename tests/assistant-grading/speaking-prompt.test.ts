import { expect, test } from 'vitest'
import { assistantPrompt } from '../../src/assistant-grading/index.ts'
import { sprechen1, sprechen2, sprechen3 } from './tasks.ts'

/**
 * The expected criteria, points and descriptors below are written out from
 * the official score sheet and criteria table (Modellsatz B1, Prüferblätter),
 * not taken from the code.
 */

test('the prompt for planning together holds the situation and the points to plan', () => {
  const prompt = assistantPrompt(sprechen1, 'en')

  expect(prompt).toContain('Ihr Kurs macht am Ende ein Fixture-Fest. Sie organisieren es zu zweit.')
  for (const point of ['Wann und wo feiern?', 'Was essen und trinken?', 'Wer bringt was mit?', 'Welches Programm?']) {
    expect(prompt).toContain(point)
  }
})

test('the prompt for a presentation holds the topic and the five slides', () => {
  const prompt = assistantPrompt(sprechen2, 'en')

  expect(prompt).toContain('Fixture-Einkaufen im Internet')
  expect(prompt).toContain('1. Stellen Sie Ihr Thema vor')
  expect(prompt).toContain('5. Beenden Sie Ihre Präsentation')
})

test('the prompt makes the assistant run the part by voice, in German only', () => {
  for (const task of [sprechen1, sprechen2, sprechen3]) {
    const prompt = assistantPrompt(task, 'en')

    expect(prompt).toMatch(/voice mode/i)
    expect(prompt).toMatch(/speak only German/i)
  }
})

test('in Teil 1 the assistant plays the other candidate, who plans with the learner', () => {
  const prompt = assistantPrompt(sprechen1, 'en')

  expect(prompt).toMatch(/you (play|are) the other candidate/i)
  expect(prompt).toMatch(/suggestions of your own/i)
  expect(prompt).toContain('Das ist das Ende von Teil 1.')
})

test('in Teil 2 the assistant is the examiner, who lets the learner present without interrupting', () => {
  const prompt = assistantPrompt(sprechen2, 'en')

  expect(prompt).toMatch(/you are the examiner/i)
  expect(prompt).toMatch(/do not interrupt/i)
  expect(prompt).toContain('Das ist das Ende von Teil 2.')
})

test('in Teil 3 the assistant presents the topic briefly, takes feedback and a question, then asks two questions', () => {
  const prompt = assistantPrompt(sprechen3, 'en')

  expect(prompt).toContain('Fixture-Sport im Verein')
  expect(prompt).toMatch(/give a short presentation/i)
  expect(prompt).toMatch(/ask me two questions/i)
  expect(prompt).toContain('Das ist das Ende von Teil 3.')
})

test('the assistant must not help during the part, and must not rate before it has ended', () => {
  const prompt = assistantPrompt(sprechen1, 'en')

  expect(prompt).toMatch(/no corrections/i)
  expect(prompt).toMatch(/do not rate anything before the part has ended/i)
})

test('the prompt for Teil 1 holds its four official criteria and Aussprache, with their points for each band', () => {
  const prompt = assistantPrompt(sprechen1, 'en')

  for (const criterion of ['Erfüllung', 'Interaktion', 'Wortschatz', 'Strukturen', 'Aussprache']) {
    expect(prompt).toContain(`${criterion} (`)
  }
  expect(occurrences(prompt, 'A = 8 | B = 6 | C = 4 | D = 2 | E = 0')).toBe(3)
  expect(occurrences(prompt, 'A = 4 | B = 3 | C = 2 | D = 1 | E = 0')).toBe(1)
  expect(occurrences(prompt, 'A = 16 | B = 12 | C = 8 | D = 4 | E = 0')).toBe(1)
  expect(prompt).toContain('28 points')
})

test('the prompt for Teil 2 uses that part’s own criteria and point values', () => {
  const prompt = assistantPrompt(sprechen2, 'en')

  for (const criterion of ['Erfüllung', 'Kohärenz', 'Wortschatz', 'Strukturen', 'Aussprache']) {
    expect(prompt).toContain(`${criterion} (`)
  }
  expect(prompt).not.toContain('Interaktion')
  expect(occurrences(prompt, 'A = 12 | B = 9 | C = 6 | D = 3 | E = 0')).toBe(3)
  expect(occurrences(prompt, 'A = 4 | B = 3 | C = 2 | D = 1 | E = 0')).toBe(1)
  expect(prompt).toContain('40 points')
})

test('the prompt for Teil 3 rates Erfüllung and Aussprache only', () => {
  const prompt = assistantPrompt(sprechen3, 'en')

  expect(occurrences(prompt, 'A = 16 | B = 12 | C = 8 | D = 4 | E = 0')).toBe(2)
  expect(prompt).toContain('Sprachfunktionen (Rückmeldung, Frage stellen, beantworten), Inhalt, Umfang')
  expect(prompt).not.toContain('Strukturen (')
  expect(prompt).toContain('16 points')
})

test('the speaking prompts give the official descriptors, in the official German', () => {
  const teil1 = assistantPrompt(sprechen1, 'en')
  for (const descriptor of [
    'Sprachfunktionen in Inhalt und Umfang angemessen behandelt',
    'Gesprächsanteil nicht bewertbar',
    'Das Gespräch beginnen, in Gang halten, beenden; Reaktionsfähigkeit',
    'noch weitgehend situations- und partneradäquat',
    'Spektrum differenziert; vereinzelte Fehlgriffe stören nicht',
    'mehrere Fehlgriffe stören erheblich',
    'Äußerung größtenteils unverständlich',
    'Satzmelodie, Wortakzent, Einzelne Laute',
    'Keine auffälligen Abweichungen',
    'Wahrnehmbare Abweichungen beeinträchtigen das Verständnis nicht',
    'Abweichungen beeinträchtigen das Verständnis stellenweise',
    'nicht mehr verständlich',
  ]) {
    expect(teil1).toContain(descriptor)
  }
  // Spelling is a writing criterion only.
  expect(teil1).not.toContain('Orthografie')

  const teil2 = assistantPrompt(sprechen2, 'en')
  for (const descriptor of [
    'Alle 5 Folien in Inhalt und Umfang angemessen behandelt',
    '3-4 Folien in Inhalt und Umfang angemessen behandelt',
    '2 Folien in Inhalt und Umfang angemessen behandelt oder alle Folien zu knapp',
    '1 Folie in Inhalt und Umfang angemessen behandelt',
    'Präsentation nicht bewertbar',
    'Verknüpfung von Sätzen und Satzteilen; nachvollziehbarer Gedankengang',
  ]) {
    expect(teil2).toContain(descriptor)
  }
})

test('the score out of 100 is the part scaled to 84 points plus the 16 points of Aussprache', () => {
  expect(assistantPrompt(sprechen1, 'en')).toContain('points × 84 ÷ 28 + Aussprache points')
  expect(assistantPrompt(sprechen2, 'en')).toContain('points × 84 ÷ 40 + Aussprache points')
  expect(assistantPrompt(sprechen3, 'en')).toContain('points × 84 ÷ 16 + Aussprache points')
  // The worked example: 21 of 28 points and 12 for Aussprache.
  expect(assistantPrompt(sprechen1, 'en')).toContain('21 × 84 ÷ 28 + 12 = 75')
})

test('the assistant says the score last, as one number out of 100', () => {
  expect(assistantPrompt(sprechen1, 'en')).toMatch(/last sentence[^.]*<number> out of 100/i)
})

test('a part that was typed instead of spoken gets no score, because Aussprache cannot be rated', () => {
  const prompt = assistantPrompt(sprechen1, 'en')

  expect(prompt).toMatch(/typed/i)
  expect(prompt).toMatch(/do not give a score/i)
})

test('the speaking prompt demands strict grading and the official knock-out rule', () => {
  const prompt = assistantPrompt(sprechen1, 'en')

  expect(prompt).toMatch(/grade strictly/i)
  expect(prompt).toMatch(/between two bands, (give|choose) the lower/i)
  expect(prompt).toMatch(/Erfüllung is E, the whole part scores 0/)
  expect(prompt).toMatch(/never a value in between/i)
})

test.each([
  ['en', 'in English'],
  ['fa', 'in Persian'],
  ['de', 'in simple German'],
] as const)('the assistant gives the rating in the learner’s language (%s)', (language, wording) => {
  expect(assistantPrompt(sprechen1, language)).toContain(wording)
})

function occurrences(text: string, part: string): number {
  return text.split(part).length - 1
}

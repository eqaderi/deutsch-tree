import { expect, test } from 'vitest'
import { assistantPrompt } from '../../src/assistant-grading/index.ts'
import { schreiben1, schreiben2, schreiben3 } from './tasks.ts'

/**
 * The expected criteria, points and descriptors below are written out from
 * the official score sheet and criteria table (Modellsatz B1, Prüferblätter),
 * not taken from the code.
 */

test('the prompt for a writing task holds the whole task', () => {
  const prompt = assistantPrompt(schreiben1, 'en')

  expect(prompt).toContain('Sie waren am Samstag auf dem Fixture-Fest. Ihre Freundin Mira konnte nicht kommen.')
  expect(prompt).toContain('Beschreiben Sie: Wie war das Fest?')
  expect(prompt).toContain('Begründen Sie: Warum war es schön?')
  expect(prompt).toContain('Schlagen Sie ein Treffen vor.')
  expect(prompt).toContain('80 Wörtern')
})

test('the prompt for an opinion post holds the opinion the learner replies to', () => {
  const prompt = assistantPrompt(schreiben2, 'en')

  expect(prompt).toContain('In einem Forum lesen Sie eine Diskussion zum Thema „Fixture-Arbeit zu Hause“.')
  expect(prompt).toContain('Tarek')
  expect(prompt).toContain('Zu Hause arbeite ich ruhiger, aber die Kollegen fehlen mir.')
})

test('the prompt for Aufgabe 1 holds the four official criteria with their points for each band', () => {
  const prompt = assistantPrompt(schreiben1, 'en')

  for (const criterion of ['Erfüllung', 'Kohärenz', 'Wortschatz', 'Strukturen']) {
    expect(prompt).toContain(`${criterion} (`)
  }
  expect(occurrences(prompt, 'A = 10 | B = 7.5 | C = 5 | D = 2.5 | E = 0')).toBe(4)
  expect(prompt).toContain('40 points')
})

test('the prompt for Aufgabe 3 uses that task’s own, smaller point values', () => {
  const prompt = assistantPrompt(schreiben3, 'en')

  expect(occurrences(prompt, 'A = 4 | B = 3 | C = 2 | D = 1 | E = 0')).toBe(2)
  expect(occurrences(prompt, 'A = 6 | B = 4.5 | C = 3 | D = 1.5 | E = 0')).toBe(2)
  expect(prompt).toContain('20 points')
  expect(prompt).toContain('40 Wörtern')
})

test('the prompt gives the official descriptor of every band, in the official German', () => {
  const prompt = assistantPrompt(schreiben1, 'en')

  for (const descriptor of [
    'Alle 3 Sprachfunktionen inhaltlich und umfänglich angemessen behandelt',
    '2 Sprachfunktionen angemessen oder 1 angemessen und 2 teilweise',
    '1 Sprachfunktion angemessen und 1 teilweise oder alle teilweise',
    '1 Sprachfunktion angemessen oder teilweise',
    'Textumfang weniger als 50 % der geforderten Wortanzahl oder Thema verfehlt',
    'Textsorte durchgängig umgesetzt',
    'noch weitgehend situations- und partneradäquat',
    'Textaufbau durchgängig und effektiv',
    'Textaufbau stellenweise erkennbar',
    'Spektrum differenziert; vereinzelte Fehlgriffe beeinträchtigen das Verständnis nicht',
    'mehrere Fehlgriffe beeinträchtigen das Verständnis teilweise',
    'Spektrum kaum vorhanden; mehrere Fehlgriffe beeinträchtigen das Verständnis erheblich',
    'Text durchgängig unangemessen',
    'Beherrschung (Morphologie, Syntax, Orthografie)',
  ]) {
    expect(prompt).toContain(descriptor)
  }
})

test('each writing task is rated on its own descriptor of Erfüllung', () => {
  expect(assistantPrompt(schreiben2, 'en')).toContain('Meinungsäußerung inhaltlich und umfänglich angemessen')
  expect(assistantPrompt(schreiben3, 'en')).toContain('Mitteilung inhaltlich und soziokulturell angemessen')
  expect(assistantPrompt(schreiben3, 'en')).not.toContain('Sprachfunktionen')
})

test('the prompt states the official rule that a failed Erfüllung makes the whole task 0, with the word limit', () => {
  expect(assistantPrompt(schreiben1, 'en')).toMatch(/Erfüllung is E, the whole task scores 0/)
  expect(assistantPrompt(schreiben1, 'en')).toContain('fewer than 40 words')
  expect(assistantPrompt(schreiben3, 'en')).toContain('fewer than 20 words')
})

test('the prompt allows only the printed point values', () => {
  expect(assistantPrompt(schreiben1, 'en')).toMatch(/never a value in between/i)
})

test('the prompt demands strict grading', () => {
  const prompt = assistantPrompt(schreiben1, 'en')

  expect(prompt).toMatch(/grade strictly/i)
  expect(prompt).toMatch(/between two bands, (give|choose) the lower/i)
  expect(prompt).toMatch(/quote/i)
})

test('the prompt asks for one score out of 100 for the task, worked out from the points', () => {
  // Aufgabe 1 and 2: points of 40. Aufgabe 3: points of 20.
  expect(assistantPrompt(schreiben1, 'en')).toContain('points × 100 ÷ 40')
  expect(assistantPrompt(schreiben3, 'en')).toContain('points × 100 ÷ 20')
  expect(assistantPrompt(schreiben1, 'en')).toContain('SCORE: <number>/100')
})

test.each([
  ['en', 'in English'],
  ['fa', 'in Persian'],
  ['de', 'in simple German'],
] as const)('the assistant is told to answer the learner in their language (%s)', (language, wording) => {
  expect(assistantPrompt(schreiben1, language)).toContain(wording)
})

test('the prompt ends where the learner adds the text', () => {
  expect(assistantPrompt(schreiben1, 'en').trimEnd()).toMatch(/My text:$/)
})

function occurrences(text: string, part: string): number {
  return text.split(part).length - 1
}

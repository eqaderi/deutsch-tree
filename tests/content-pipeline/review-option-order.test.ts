/**
 * Where the right option stands on a review sheet. Writers tend to put the
 * right option first, and the words of a vocabulary node came out with the
 * right meaning last; a reviewer who sees such a sheet can answer by place
 * instead of by meaning. So the sheet mixes the options by themselves alone.
 */
import { expect, test } from 'vitest'
import { blindPool, recordReview } from '../../src/content-pipeline/review.ts'
import { changeNode, fixtureContentWith, PUBLISHED, VOCABULARY, withoutReviewRecord } from './fixture.ts'
import { answered, RIGHT } from './review-sheet.ts'

const BY = { reviewer: 'Second fixture reviewer', date: '2026-02-03' }

/** The options of question `id` of the fixture's grammar node as the sheet shows them, written in `order`. */
async function shownOptions(id: string, order: string[]): Promise<unknown> {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions.find((question: { id: string }) => question.id === id).options = order
      node.status = 'coming-soon'
    }),
  })
  const sheet = await blindPool(content, 'grammar-001', [id])
  return sheet.questions[0]?.question.options
}

test('the options of a multiple choice or gap fill question stand on the sheet in an order that does not follow how they are written', async () => {
  for (const [id, options] of [
    ['q1', ['wohne', 'wohnst', 'wohnt']],
    ['q12', ['koche', 'kochst', 'kochen']],
  ] as const) {
    const [a, b, c] = options
    const orders = [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ]
    const shown = new Set<string>()
    for (const order of orders) shown.add(JSON.stringify(await shownOptions(id, order)))

    expect(shown.size).toBe(1)
    expect(JSON.parse([...shown][0] ?? '[]').sort()).toEqual([...options].sort())
  }
})

/** How often the key stands in each place, as a share of `places`, a list of places of the key. */
function shares(places: number[], options: number): number[] {
  return Array.from({ length: options }, (_, place) => places.filter((at) => at === place).length / places.length)
}

test('on the sheet of a vocabulary node the right meaning stands in each of the four places about as often', async () => {
  // Forty nouns, each with a meaning of its own in every language: 120 questions from German on the sheet.
  const words = Array.from({ length: 40 }, (_, index) => ({
    word: `Wort${index}`,
    class: 'noun',
    article: 'das',
    plural: `Wörter${index}`,
    level: 'A1',
    meaning: { en: `thing ${index}`, fa: `چیز ${index}` },
    definition: `das Ding mit der Nummer ${index}`,
    example: { de: `Das ist Wort${index}.`, en: `That is thing ${index}.`, fa: `این چیز ${index} است.` },
  }))
  const content = await fixtureContentWith({
    [VOCABULARY]: changeNode((node) => {
      node.words = words
      node.status = 'coming-soon'
    }),
  })
  const sheet = await blindPool(content, 'vocabulary-fixture-home')

  const places: number[] = []
  for (const entry of sheet.questions) {
    if (entry.question.type !== 'meaning-of-word' || !entry.language) continue
    const word = words.find(({ word }) => `das ${word}` === entry.question.prompt)
    const key = entry.language === 'de' ? word?.definition : word?.meaning[entry.language]
    places.push((entry.question.options as string[]).indexOf(key ?? ''))
  }

  expect(places).toHaveLength(120)
  for (const share of shares(places, 4)) {
    expect(share).toBeGreaterThan(0.15)
    expect(share).toBeLessThan(0.35)
  }
})

test('a sheet that shows the options as they are written, as sheets did before they were mixed, is still the same question', async () => {
  const content = await fixtureContentWith({ [PUBLISHED]: withoutReviewRecord })
  const sheet = answered(await blindPool(content, 'grammar-001'), RIGHT)
  // The options of q1 and q12 as the node file writes them.
  const written: Record<string, string[]> = { q1: ['wohne', 'wohnst', 'wohnt'], q12: ['koche', 'kochst', 'kochen'] }
  const olderSheet = {
    ...sheet,
    questions: sheet.questions.map((entry) =>
      written[entry.id] ? { ...entry, question: { ...entry.question, options: written[entry.id] } } : entry,
    ),
  }
  expect(olderSheet).not.toEqual(sheet)

  const result = await recordReview(content, 'grammar-001', [olderSheet], BY)

  expect(result.disagreements).toEqual([])
  expect(result.record).not.toBeNull()
})

import { expect, test } from 'vitest'
import { compiledExtra, problemsOfExtra, withQuestion } from './extra-question.ts'

const findError = { type: 'find-error', prompt: 'Du wohne in Berlin.', answer: 'wohne' }

test('a find the error question is a German sentence and the one word in it that is wrong', async () => {
  const content = await withQuestion(findError)

  expect(await compiledExtra(content)).toEqual({
    id: 'extra',
    type: 'find-error',
    prompt: 'Du wohne in Berlin.',
    // The app gets the sentence cut into its words and what stands between them.
    parts: [{ word: 'Du' }, ' ', { word: 'wohne' }, ' ', { word: 'in' }, ' ', { word: 'Berlin' }, '.'],
    // The place of the wrong word among the words: the second one.
    answer: 1,
    explanation: expect.objectContaining({ en: ['With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'] }),
  })
})

test('a word of the sentence is whatever stands between spaces and punctuation', async () => {
  const content = await withQuestion({
    type: 'find-error',
    prompt: 'Wohnst du hier, oder wohnt du in der Park-Straße?',
    answer: 'wohnt',
  })

  expect(await compiledExtra(content)).toMatchObject({
    parts: [
      { word: 'Wohnst' },
      ' ',
      { word: 'du' },
      ' ',
      { word: 'hier' },
      ', ',
      { word: 'oder' },
      ' ',
      { word: 'wohnt' },
      ' ',
      { word: 'du' },
      ' ',
      { word: 'in' },
      ' ',
      { word: 'der' },
      ' ',
      { word: 'Park-Straße' },
      '?',
    ],
    answer: 4,
  })
})

test('a find the error question whose answer is no word of the sentence is rejected', async () => {
  const content = await withQuestion({ ...findError, answer: 'wohnst' })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'no correct answer: "wohnst" is not a word of the sentence' },
  ])
})

test('a find the error question whose answer stands in the sentence twice is rejected', async () => {
  const content = await withQuestion({
    type: 'find-error',
    prompt: 'Die Frau sieht die Mann, die hier wohnt.',
    answer: 'die',
  })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: '2 correct answers: "die" is in the sentence 2 times' },
  ])
})

test('a find the error question that states no answer, or two, is rejected', async () => {
  const { answer: _answer, ...noAnswer } = findError

  expect(await problemsOfExtra(await withQuestion(noAnswer))).toEqual([
    { where: 'answer', message: 'no correct answer: the question states none' },
  ])
  expect(await problemsOfExtra(await withQuestion({ ...findError, answer: ['Du', 'wohne'] }))).toEqual([
    { where: 'answer', message: '2 correct answers: a find-error question has exactly one' },
  ])
})

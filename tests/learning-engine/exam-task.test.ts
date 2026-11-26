import { expect, test } from 'vitest'
import { checkAnswer, EXAM_MODULES, examModuleOf, nextTask, scoreAttempt } from '../../src/learning-engine/index.ts'
import { richtigFalsch } from './questions.ts'
import { seededRandom } from './random.ts'

test('a Richtig/Falsch answer is right when it judges the statement as the text does', () => {
  expect(checkAnswer(richtigFalsch('i1', true), true).correct).toBe(true)
  expect(checkAnswer(richtigFalsch('i1', true), false).correct).toBe(false)
  expect(checkAnswer(richtigFalsch('i2', false), false).correct).toBe(true)
  expect(checkAnswer(richtigFalsch('i2', false), true).correct).toBe(false)
  expect(checkAnswer(richtigFalsch('i2', false), undefined).correct).toBe(false)
})

/** A task of Lesen, Teil 1: six statements. Its key is Richtig, Falsch, Falsch, Richtig, Falsch, Richtig. */
const KEY = [true, false, false, true, false, true]
const items = KEY.map((answer, index) => richtigFalsch(`i${index + 1}`, answer))

test('a task is scored per item, in the order of its items', () => {
  const result = scoreAttempt(items, [true, true, false, true, undefined, true])

  expect(result).toMatchObject({ total: 6, correct: 4 })
  expect(result.questions.map((item) => [item.question.id, item.answer, item.correct])).toEqual([
    ['i1', true, true],
    ['i2', true, false],
    ['i3', false, true],
    ['i4', true, true],
    ['i5', undefined, false],
    ['i6', true, true],
  ])
})

test('the 90% rule on a task of six items: five right is 83%, so only six of six passes', () => {
  expect(scoreAttempt(items, KEY)).toMatchObject({ correct: 6, passMark: 6, passed: true })
  expect(scoreAttempt(items, [true, false, false, true, false, false])).toMatchObject({
    correct: 5,
    passMark: 6,
    passed: false,
  })
})

test('the first attempt at an exam part takes any of its practice tasks', () => {
  const tasks = ['t1', 't2', 't3']
  const random = seededRandom(11)

  const taken = new Set(Array.from({ length: 40 }, () => nextTask(tasks, undefined, random)))

  expect([...taken].sort()).toEqual(tasks)
})

test('a retry takes another task than the one just taken', () => {
  const tasks = ['t1', 't2', 't3']
  const random = seededRandom(5)

  for (const last of tasks) {
    const taken = new Set(Array.from({ length: 40 }, () => nextTask(tasks, last, random)))

    expect([...taken].sort()).toEqual(tasks.filter((task) => task !== last))
  }
  expect(nextTask(['t1', 't2'], 't1', () => 0)).toBe('t2')
  expect(nextTask(['t1', 't2'], 't2', () => 0.999)).toBe('t1')
})

test('an exam part with one practice task gives that task again', () => {
  expect(nextTask(['t1'], 't1', seededRandom(1))).toBe('t1')
  expect(nextTask(['t1'], undefined, seededRandom(1))).toBe('t1')
})

test('an exam part without a practice task gives none', () => {
  expect(nextTask([], undefined, seededRandom(1))).toBeUndefined()
})

test('the module of an exam-part node is one of the four modules that scores are kept for', () => {
  // Node files use the exam's own words; scores are kept under English names, in the order of the exam.
  expect((['lesen', 'hoeren', 'schreiben', 'sprechen'] as const).map(examModuleOf)).toEqual([
    'reading',
    'listening',
    'writing',
    'speaking',
  ])
  expect(EXAM_MODULES).toEqual(['reading', 'listening', 'writing', 'speaking'])
})

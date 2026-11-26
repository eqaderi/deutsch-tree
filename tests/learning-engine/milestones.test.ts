import { expect, test } from 'vitest'
import {
  applyAttempt,
  emptyProgress,
  hasProgress,
  milestonesReached,
  milestoneToMention,
  type Progress,
} from '../../src/learning-engine/index.ts'

type Topic = Parameters<typeof milestonesReached>[0][number]

const published = (id: string, level: string): Topic => ({ id, level, status: 'published' })
const comingSoon = (id: string, level: string): Topic => ({ id, level, status: 'coming-soon' })

function done(...ids: string[]): Progress {
  return ids.reduce((progress, id) => applyAttempt(progress, id, { passed: true }), emptyProgress())
}

/** Identifiers "topic-1" to "topic-<count>". */
const topics = (count: number) => Array.from({ length: count }, (_, index) => `topic-${index + 1}`)

const content = [
  published('a1-1', 'A1'),
  published('a1-2', 'A1'),
  comingSoon('a1-3', 'A1'),
  published('a2-1', 'A2'),
  comingSoon('b1-1', 'B1'),
]

test('a learner who has done nothing has reached no milestone', () => {
  expect(milestonesReached(content, emptyProgress())).toEqual([])
})

test('a level is a milestone when every topic of it that can be taken is done', () => {
  expect(milestonesReached(content, done('a1-1'))).toEqual([])
  expect(milestonesReached(content, done('a1-1', 'a1-2'))).toEqual([{ id: 'level:A1', kind: 'level', level: 'A1' }])
})

test('a failed test does not count towards a level', () => {
  const progress = applyAttempt(done('a1-1'), 'a1-2', { passed: false })

  expect(milestonesReached(content, progress)).toEqual([])
})

test('a level with nothing published yet is never finished', () => {
  const everything = done('a1-1', 'a1-2', 'a2-1')

  expect(milestonesReached(content, everything).map((milestone) => milestone.id)).toEqual(['level:A1', 'level:A2'])
})

test('every tenth done topic is a milestone', () => {
  const none: Topic[] = []

  expect(milestonesReached(none, done(...topics(9)))).toEqual([])
  expect(milestonesReached(none, done(...topics(10)))).toEqual([{ id: 'topics:10', kind: 'topics', count: 10 }])
  expect(milestonesReached(none, done(...topics(19)))).toEqual([{ id: 'topics:10', kind: 'topics', count: 10 }])
  expect(milestonesReached(none, done(...topics(20)))).toEqual([{ id: 'topics:20', kind: 'topics', count: 20 }])
})

test('a done topic that the content no longer has still counts as done', () => {
  // Ten topics done, then the content was reorganised and only two of them are left.
  const progress = done(...topics(8), 'a1-1', 'a1-2')

  expect(milestonesReached(content, progress).map((milestone) => milestone.id)).toEqual(['level:A1', 'topics:10'])
})

test('a milestone is mentioned once: not again after it was acknowledged', () => {
  const reached = milestonesReached(content, done(...topics(8), 'a1-1', 'a1-2'))

  expect(milestoneToMention(reached, [])?.id).toBe('level:A1')
  expect(milestoneToMention(reached, ['level:A1'])?.id).toBe('topics:10')
  expect(milestoneToMention(reached, ['level:A1', 'topics:10'])).toBeUndefined()
})

test('of several new milestones, the latest level is the one mentioned', () => {
  const reached = milestonesReached(content, done(...topics(8), 'a1-1', 'a1-2', 'a2-1'))

  expect(milestoneToMention(reached, [])?.id).toBe('level:A2')
})

test('there is progress to lose from the first finished test on, passed or not', () => {
  expect(hasProgress(emptyProgress())).toBe(false)
  expect(hasProgress(applyAttempt(emptyProgress(), 'a1-1', { passed: false }))).toBe(true)
  expect(hasProgress(done('a1-1'))).toBe(true)
})

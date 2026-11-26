import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, fixtureContent, fixtureContentWith, SPEAKING, WRITING } from './fixture.ts'

test('a published writing node is compiled with its task, ready to build a prompt from', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report.errors).toEqual([])
  expect(bundle?.nodes.find((node) => node.id === 'exam-schreiben-1')?.content).toEqual({
    task: {
      module: 'schreiben',
      part: 1,
      situation: 'Sie waren am Samstag auf dem Fixture-Fest in Ihrer Straße. Ihre Freundin Mira konnte nicht kommen.',
      points: [
        'Beschreiben Sie: Wie war das Fest?',
        'Begründen Sie: Was hat Ihnen besonders gut gefallen und warum?',
        'Schlagen Sie ein Treffen vor.',
      ],
    },
  })
})

test('a published speaking node is compiled with its task', async () => {
  const { bundle } = await compileContent(fixtureContent)

  expect(bundle?.nodes.find((node) => node.id === 'exam-sprechen-1')?.content).toEqual({
    task: {
      module: 'sprechen',
      part: 1,
      situation: 'Ihr Kurs macht am Ende ein Fixture-Fest. Sie organisieren das Fest zu zweit.',
      points: ['Wann und wo feiern?', 'Was essen und trinken?', 'Wer bringt was mit?', 'Welches Programm?'],
    },
  })
})

test('a published writing or speaking node without a task is rejected', async () => {
  const content = await fixtureContentWith({
    [WRITING]: changeNode((node) => {
      delete node.task
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: WRITING, node: 'exam-schreiben-1', where: 'task', message: 'is required for a published node' },
  ])
  expect(bundle).toBeNull()
})

test('a "coming soon" writing node needs no task yet', async () => {
  const content = await fixtureContentWith({
    [WRITING]: changeNode((node) => {
      node.status = 'coming-soon'
      delete node.task
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([])
  expect(bundle?.nodes.find((node) => node.id === 'exam-schreiben-1')?.content).toBeNull()
})

test('Schreiben Aufgabe 1 has exactly three content points', async () => {
  const content = await fixtureContentWith({
    [WRITING]: changeNode((node) => {
      node.task.points = node.task.points.slice(0, 2)
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: WRITING,
      node: 'exam-schreiben-1',
      where: 'task.points',
      message: 'Schreiben Aufgabe 1 has exactly 3 points, this task has 2',
    },
  ])
})

test('Sprechen Teil 1 has exactly four points to plan', async () => {
  const content = await fixtureContentWith({
    [SPEAKING]: changeNode((node) => {
      node.task.points.push('Wer räumt auf?')
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: SPEAKING,
      node: 'exam-sprechen-1',
      where: 'task.points',
      message: 'Sprechen Teil 1 has exactly 4 points, this task has 5',
    },
  ])
})

test('a task holds the fields of its own exam part and no others', async () => {
  // Aufgabe 2 is an opinion post: a situation and one opinion to reply to, no content points.
  const content = await fixtureContentWith({
    [WRITING]: changeNode((node) => {
      node.id = 'exam-schreiben-2'
      node.part = 2
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: WRITING,
      node: 'exam-schreiben-2',
      where: 'task.opinion',
      message: 'is required for Schreiben Aufgabe 2',
    },
    {
      file: WRITING,
      node: 'exam-schreiben-2',
      where: 'task.points',
      message: 'does not belong to Schreiben Aufgabe 2; that task has: situation, opinion',
    },
  ])
})

test('a presentation task is a topic; the five slides are the same for every topic', async () => {
  const content = await fixtureContentWith({
    'nodes/exam-part/exam-sprechen-2.yaml': () =>
      [
        'id: exam-sprechen-2',
        'kind: exam-part',
        'level: B1',
        'chapter: fixture-sprechen',
        'order: 2',
        'status: published',
        'module: sprechen',
        'part: 2',
        'title: { en: Fixture presentation, fa: ارائهٔ آزمایشی, de: Test-Präsentation }',
        'task:',
        '  topic: Fixture-Einkaufen im Internet',
      ].join('\n'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([])
  expect(bundle?.nodes.find((node) => node.id === 'exam-sprechen-2')?.content).toEqual({
    task: { module: 'sprechen', part: 2, topic: 'Fixture-Einkaufen im Internet' },
  })
})

test('a writing or speaking node is one of the three parts of its module', async () => {
  const content = await fixtureContentWith({
    [WRITING]: changeNode((node) => {
      node.id = 'exam-schreiben-4'
      node.part = 4
      node.status = 'coming-soon'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: WRITING, node: 'exam-schreiben-4', where: 'part', message: 'schreiben has parts 1 to 3' },
  ])
})

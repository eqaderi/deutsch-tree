import { expect, test } from 'vitest'
import { parse, stringify } from 'yaml'
import { mockExamFileSchema } from '../../src/content-model/index.ts'
import { bundleFiles, compileContent } from '../../src/content-pipeline/index.ts'
import { mockExamTasks } from '../../src/content-pipeline/mock-exams.ts'
import { blindPool, reviewFingerprint } from '../../src/content-pipeline/review.ts'
import { changeNode, fixtureContent, fixtureContentWith } from './fixture.ts'

/** The fixture's published mock exam: all five parts of Lesen and all four of Hören. */
const MOCK_EXAM = 'mock-exams/mock-exam-1.yaml'

async function compiledFixture() {
  const { report, bundle } = await compileContent(fixtureContent)
  expect(report.errors).toEqual([])
  if (!bundle) throw new Error('the fixture content does not compile')
  return bundle
}

/** The problems of the fixture content with the mock exam changed, its review brought up to date. */
async function problemsWith(change: (exam: ReturnType<typeof parse>) => void, { review = true } = {}) {
  const content = await fixtureContentWith({
    [MOCK_EXAM]: (text) => {
      const exam = parse(text)
      change(exam)
      const read = mockExamFileSchema.safeParse(exam)
      if (review && read.success && exam.review)
        exam.review.pool = reviewFingerprint({ practice: mockExamTasks(read.data) })
      return stringify(exam)
    },
  })
  const { report } = await compileContent(content, { requireAudio: false })
  return report.errors.map(({ file, where, message }) => ({ file, where, message }))
}

test('a mock exam holds Lesen in five parts and Hören in four, thirty items each, with the time of each module', async () => {
  const { mockExams } = await compiledFixture()

  const exam = mockExams.find((candidate) => candidate.id === 'mock-exam-1')
  const modules = (exam?.content?.modules ?? []).flatMap((module) => (module.scoredBy === 'items' ? [module] : []))
  expect(
    modules.map((module) => ({
      module: module.module,
      minutes: module.minutes,
      parts: module.parts.map((part) => [part.part, part.task.id, part.task.items.length, part.plays]),
    })),
  ).toEqual([
    {
      module: 'lesen',
      minutes: 65,
      parts: [
        [1, 'lesen-1', 6, undefined],
        [2, 'lesen-2', 6, undefined],
        [3, 'lesen-3', 7, undefined],
        [4, 'lesen-4', 7, undefined],
        [5, 'lesen-5', 4, undefined],
      ],
    },
    {
      module: 'hoeren',
      minutes: 40,
      // Teil 1 and Teil 4 are heard twice, Teil 2 and Teil 3 once.
      parts: [
        [1, 'hoeren-1', 10, 2],
        [2, 'hoeren-2', 5, 1],
        [3, 'hoeren-3', 7, 1],
        [4, 'hoeren-4', 8, 2],
      ],
    },
  ])
})

test('a mock exam holds Schreiben in three tasks and Sprechen in three parts, graded by an assistant, after Lesen and Hören', async () => {
  const { mockExams } = await compiledFixture()

  const modules = mockExams.find((candidate) => candidate.id === 'mock-exam-1')?.content?.modules ?? []
  expect(modules.map((module) => [module.module, module.scoredBy, module.minutes])).toEqual([
    ['lesen', 'items', 65],
    ['hoeren', 'items', 40],
    ['schreiben', 'assistant', 60],
    ['sprechen', 'assistant', 15],
  ])
  const [schreiben, sprechen] = modules.slice(2)
  expect(schreiben?.parts).toEqual([
    {
      part: 1,
      task: {
        module: 'schreiben',
        part: 1,
        situation: 'Sie haben am Wochenende einen Ausflug an den See gemacht. Ihr Freund Tim war nicht dabei.',
        points: [
          'Beschreiben Sie: Wie war der Ausflug?',
          'Begründen Sie: Was hat Ihnen nicht gefallen?',
          'Machen Sie einen Vorschlag für den nächsten Ausflug.',
        ],
      },
    },
    {
      part: 2,
      task: {
        module: 'schreiben',
        part: 2,
        situation:
          'Sie haben im Radio eine Sendung zum Thema „Fahrrad in der Stadt“ gehört. Im Gästebuch der Sendung lesen Sie diese Meinung:',
        opinion: { author: 'Jonas', text: 'In der Stadt fahre ich nur Fahrrad. Ein Auto brauche ich nicht.' },
      },
    },
    {
      part: 3,
      task: {
        module: 'schreiben',
        part: 3,
        situation:
          'Sie haben morgen einen Termin bei Ihrer Ärztin, Frau Dr. Berg. Sie können nicht kommen. Schreiben Sie an die Praxis: Entschuldigen Sie sich und bitten Sie um einen neuen Termin.',
      },
    },
  ])
  expect(sprechen?.parts.map((part) => [part.part, part.task])).toEqual([
    [
      1,
      {
        module: 'sprechen',
        part: 1,
        situation:
          'Eine Freundin aus Ihrem Deutschkurs hat bald Geburtstag. Sie möchten zusammen eine Feier für sie planen.',
        points: ['Wann und wo feiern?', 'Wer kommt?', 'Essen und Trinken?', 'Geschenk?'],
      },
    ],
    [2, { module: 'sprechen', part: 2, topic: 'Brauchen Kinder ein eigenes Handy?' }],
    [3, { module: 'sprechen', part: 3, topic: 'Sollen Städte das Auto im Zentrum verbieten?' }],
  ])
})

test('the list of mock exams names each in order, with its status and modules; one still being written has no content', async () => {
  const bundle = await compiledFixture()

  const list = JSON.parse(bundleFiles(bundle).find((file) => file.path === 'mock-exams.json')?.json ?? '{}')
  expect(list).toEqual({
    exams: [
      {
        id: 'mock-exam-1',
        order: 1,
        status: 'published',
        title: { en: ['Fixture mock exam'], fa: ['آزمون آزمایشی'], de: ['Test-Prüfung'] },
        modules: ['lesen', 'hoeren', 'schreiben', 'sprechen'],
      },
      {
        id: 'mock-exam-2',
        order: 2,
        status: 'coming-soon',
        title: { en: ['Second fixture mock exam'], fa: ['آزمون آزمایشی دوم'], de: ['Zweite Test-Prüfung'] },
        modules: [],
      },
    ],
  })
  expect(bundle.mockExams.find((exam) => exam.id === 'mock-exam-2')?.content).toBeNull()
  expect(bundleFiles(bundle).map((file) => file.path)).toEqual(
    expect.arrayContaining(['mock-exams/mock-exam-1.json', 'mock-exams/mock-exam-2.json']),
  )
})

test('an item that asks which text fits offers every text of its part and "0" for none', async () => {
  const { mockExams } = await compiledFixture()

  const lesen = mockExams[0]?.content?.modules[0]
  const teil3 = lesen?.scoredBy === 'items' ? lesen.parts[2]?.task : undefined
  expect(teil3?.items[3]).toMatchObject({
    type: 'which-text',
    prompt: 'Sie suchen einen Kurs für Ihr Auto.',
    options: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', '0'],
    answer: '0',
  })
})

test('an item that asks who says something offers the speakers of the discussion, the third in a voice of its own', async () => {
  const { mockExams } = await compiledFixture()

  const hoeren = mockExams[0]?.content?.modules[1]
  const teil4 = hoeren?.scoredBy === 'items' ? hoeren.parts[3]?.task : undefined
  expect(teil4?.items[2]).toMatchObject({
    type: 'who-says',
    options: ['Moderatorin', 'Herr Wolf', 'Frau Roth'],
    answer: 'Frau Roth',
  })
  const [text] = teil4?.texts ?? []
  if (!text || !('lines' in text)) throw new Error('the fixture discussion has no lines')
  expect(new Set(text.lines.map((line) => line.audio.voice))).toEqual(new Set(['kerstin', 'thorsten', 'mls-5424']))
})

test('a part that has not the format of its exam part is rejected, and says which part', async () => {
  const errors = await problemsWith((exam) => {
    exam.lesen[1].items.pop()
    exam.hoeren[0].items[1].type = 'richtig-falsch'
    exam.hoeren[0].items[1].answer = true
    delete exam.hoeren[0].items[1].options
    exam.lesen[4].items[0].options.push('Eine Tasche.')
  })

  expect(errors).toEqual([
    {
      file: MOCK_EXAM,
      where: 'lesen[1].items',
      message: 'not the format of Lesen, Teil 2: its task has 6 items, task "lesen-2" has 5',
    },
    {
      file: MOCK_EXAM,
      where: 'lesen[4].items[0].options',
      message: 'not the format of Lesen, Teil 5: an item has the options a, b and c, item "i1" has 4',
    },
    {
      file: MOCK_EXAM,
      where: 'hoeren[0].items[1].type',
      message: 'not the format of Hören, Teil 1: item 2 is multiple-choice, item "i2" is richtig-falsch',
    },
  ])
})

test('a published mock exam needs all parts of Lesen and Hören; one coming soon may be a title alone', async () => {
  const errors = await problemsWith((exam) => {
    exam.hoeren.pop()
  })

  expect(errors).toEqual([
    {
      file: MOCK_EXAM,
      where: 'hoeren',
      message: 'must hold the 4 parts of Hören, Teil 1 to Teil 4; it holds 3',
    },
  ])
})

test('a published mock exam needs the three tasks of Schreiben and the three parts of Sprechen', async () => {
  const errors = await problemsWith((exam) => {
    exam.schreiben.pop()
    delete exam.sprechen
  })

  expect(errors).toEqual([
    {
      file: MOCK_EXAM,
      where: 'schreiben',
      message: 'must hold the 3 parts of Schreiben, Teil 1 to Teil 3; it holds 2',
    },
    { file: MOCK_EXAM, where: 'sprechen', message: 'must hold the 3 parts of Sprechen, Teil 1 to Teil 3; it holds 0' },
  ])
})

test('a task of Schreiben or Sprechen holds the fields of its part and no others', async () => {
  const errors = await problemsWith((exam) => {
    exam.schreiben[1].points = ['Sagen Sie Ihre Meinung.']
    delete exam.schreiben[1].opinion
    exam.sprechen[0].points.pop()
    exam.sprechen.push({ topic: 'Noch ein Thema' })
  })

  expect(errors).toEqual([
    { file: MOCK_EXAM, where: 'schreiben[1].opinion', message: 'is required for Schreiben Aufgabe 2' },
    {
      file: MOCK_EXAM,
      where: 'schreiben[1].points',
      message: 'does not belong to Schreiben Aufgabe 2; that task has: situation, opinion',
    },
    { file: MOCK_EXAM, where: 'sprechen[0].points', message: 'Sprechen Teil 1 has exactly 4 points, this task has 3' },
    { file: MOCK_EXAM, where: 'sprechen', message: 'must hold the 3 parts of Sprechen, Teil 1 to Teil 3; it holds 4' },
  ])
})

test('the tasks of Schreiben and Sprechen are not on the review sheet, so changing one needs no new review', async () => {
  const errors = await problemsWith(
    (exam) => {
      exam.sprechen[1].topic = 'Ist Sport im Verein besser als allein?'
    },
    { review: false },
  )

  expect(errors).toEqual([])
})

test('an item that asks which text fits must name a text of its part or "0", and each text fits one item at most', async () => {
  const errors = await problemsWith((exam) => {
    exam.lesen[2].items[0].answer = 'k'
    exam.lesen[2].items[1].answer = 'j'
  })

  expect(errors).toEqual([
    {
      file: MOCK_EXAM,
      where: 'lesen[2].items[0].answer',
      message: '"k" is not a text of this task; its texts are a, b, c, d, e, f, g, h, i, j, or "0" when none fits',
    },
    {
      file: MOCK_EXAM,
      where: 'lesen[2].items[2].answer',
      message: 'text "j" is also the answer of item "i2": each text fits one item at most',
    },
  ])
})

test('an item that asks who says something must name a speaker of its part', async () => {
  const errors = await problemsWith((exam) => {
    exam.hoeren[3].items[0].answer = 'Frau Wolf'
  })

  expect(errors).toEqual([
    {
      file: MOCK_EXAM,
      where: 'hoeren[3].items[0].answer',
      message: '"Frau Wolf" is not a speaker of this task; its speakers are Moderatorin, Herr Wolf, Frau Roth',
    },
  ])
})

test('a published mock exam needs a review of its texts and items, and a new one when they change', async () => {
  const withoutReview = await problemsWith((exam) => {
    delete exam.review
  })
  const changed = await problemsWith(
    (exam) => {
      exam.lesen[0].items[0].answer = true
    },
    { review: false },
  )

  const steps = 'Run "pnpm review:pool mock-exam-1"; the steps are in content/README.md'
  expect(withoutReview).toEqual([
    { file: MOCK_EXAM, where: 'review', message: `a published mock exam needs a review record. ${steps}` },
  ])
  expect(changed).toEqual([
    {
      file: MOCK_EXAM,
      where: 'review',
      message: expect.stringContaining('changed after the review'),
    },
  ])
})

test('the review sheet of a mock exam holds every part as a task, its items named with the part', async () => {
  const sheet = await blindPool(fixtureContent, 'mock-exam-1')

  expect(sheet.tasks?.map((task) => task.id)).toEqual([
    'lesen-1',
    'lesen-2',
    'lesen-3',
    'lesen-4',
    'lesen-5',
    'hoeren-1',
    'hoeren-2',
    'hoeren-3',
    'hoeren-4',
  ])
  expect(sheet.questions).toHaveLength(60)
  expect(sheet.questions.find((question) => question.id === 'lesen-3/i4')?.question).toEqual({
    task: 'lesen-3',
    type: 'which-text',
    prompt: 'Sie suchen einen Kurs für Ihr Auto.',
  })
  expect(JSON.stringify(sheet)).not.toContain('Moderatorin","explanation')
})

test('German in a Persian title of a mock exam must stand in asterisks', async () => {
  const errors = await problemsWith((exam) => {
    exam.title.fa = 'آزمون Probe'
  })

  expect(errors).toEqual([
    {
      file: MOCK_EXAM,
      where: 'title.fa',
      message: 'German outside asterisks: "Probe". A Persian page shows it in the wrong order; write *Probe*',
    },
  ])
})

test('the lines of a published mock exam need their audio, and a number the voice cannot say is rejected', async () => {
  const content = await fixtureContentWith({
    [MOCK_EXAM]: changeNode((exam) => {
      exam.hoeren[0].texts[0].lines[0].text = 'Hallo Herr Klein, Ihr Auto ist jetzt fertig.'
    }),
  })
  const { report } = await compileContent(content)
  expect(report.errors.map(({ where, message }) => ({ where, message }))).toEqual([
    { where: 'review', message: expect.stringContaining('changed after the review') },
    {
      where: 'modules[1].parts[0].task.texts[0].lines[0]',
      message: expect.stringContaining('has no audio for "Hallo Herr Klein, Ihr Auto ist jetzt fertig."'),
    },
  ])

  const broken = await problemsWith((exam) => {
    exam.hoeren[0].texts[2].lines[0].text = 'Der Zug fährt erst am 3.5.2025.'
  })
  expect(broken).toEqual([
    {
      file: MOCK_EXAM,
      where: 'modules[1].parts[0].task.texts[2].lines[0]',
      message: 'holds a number that the voice would misread ("3.5.2025"): write it in words',
    },
  ])
})

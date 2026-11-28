import { rm } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { parse, stringify } from 'yaml'
import { bundleFiles, compileContent } from '../../src/content-pipeline/index.ts'
import { fixtureContent, fixtureContentWith, type LooseExams } from './fixture.ts'

const EXAMS = 'official-mock-exams.yaml'

/** An edit for `fixtureContentWith` that changes the list of official mock exams as data. */
function changeExams(change: (exams: LooseExams) => void): (text: string) => string {
  return (text) => {
    const exams = parse(text)
    change(exams)
    return stringify(exams)
  }
}

test('the list of official mock exams is compiled for the app, in the order it is written', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report.errors).toEqual([])
  expect(bundle?.officialMockExams.map((exam) => [exam.id, exam.audience, exam.countsTowardReadiness])).toEqual([
    ['fixture-adults-1', 'adults', true],
    ['fixture-adults-2', 'adults', true],
    ['fixture-youth-1', 'youth', true],
    ['fixture-youth-2', 'youth', false],
  ])
  // Only what the learner is shown: the date a maintainer last checked a link stays behind.
  expect(bundle?.officialMockExams[0]).toEqual({
    id: 'fixture-adults-1',
    title: 'Fixture-Modellsatz Erwachsene',
    publisher: 'Fixture-Institut',
    audience: 'adults',
    countsTowardReadiness: true,
    links: [
      {
        kind: 'papers',
        url: 'https://official.example/fixture-adults-1.pdf',
        candidatePages: { first: 7, last: 28 },
      },
      {
        kind: 'audio',
        url: 'https://recordings.example/downloads/',
        note: {
          en: ['On that page, look for ', { de: 'Fixture-Modellsatz' }, ' under ', { de: 'Stufe B1' }, '.'],
          fa: ['در آن صفحه، زیر ', { de: 'Stufe B1' }, ' دنبال ', { de: 'Fixture-Modellsatz' }, ' بگردید.'],
          de: ['Such auf der Seite unter ', { de: 'Stufe B1' }, ' nach ', { de: 'Fixture-Modellsatz' }, '.'],
        },
      },
    ],
  })
})

test('the list is one file of the compiled bundle', async () => {
  const { bundle } = await compileContent(fixtureContent)
  if (!bundle) throw new Error('the fixture content did not compile')

  const file = bundleFiles(bundle).find((candidate) => candidate.path === 'official-mock-exams.json')

  expect(JSON.parse(file?.json ?? 'null')).toEqual({ exams: bundle.officialMockExams })
})

test('content without a list of official mock exams is rejected', async () => {
  const content = await fixtureContentWith({})
  await rm(path.join(content, EXAMS))

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: EXAMS, message: 'is missing: the list of official mock exams that the readiness view links to' },
  ])
  expect(bundle).toBeNull()
})

test('a link must be a full https address', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      exams[0].links[0].url = 'official.example/fixture-adults-1.pdf'
      exams[1].links[0].url = 'http://official.example/fixture-adults-2.pdf'
    }),
  })

  const { report, bundle } = await compileContent(content)

  const message = 'must be a full address that starts with https://'
  expect(report.errors).toEqual([
    { file: EXAMS, where: '[0].links[0].url', message },
    { file: EXAMS, where: '[1].links[0].url', message },
  ])
  expect(bundle).toBeNull()
})

test('an exam needs at least one link', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      exams[3].links = []
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAMS,
      where: '[3].links',
      message: 'needs at least one link: the app only links to an official mock exam',
    },
  ])
})

test('two exams cannot share an id, because the learner’s recorded scores hang on it', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      exams[2].id = 'fixture-adults-1'
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([{ file: EXAMS, where: '[2].id', message: 'duplicated exam id: "fixture-adults-1"' }])
  expect(bundle).toBeNull()
})

test('the readiness rule needs two official mock exams that count', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      exams[1].countsTowardReadiness = false
      exams[2].countsTowardReadiness = false
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAMS,
      message: 'only 1 exam counts toward readiness: the readiness rule needs 2, so the learner could never reach it',
    },
  ])
  expect(bundle).toBeNull()
})

test('a note on a link is needed in all three languages', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      delete exams[0].links[1].note.de
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: EXAMS, where: '[0].links[1].note.de', message: 'is missing; this text is needed in de' },
  ])
})

test('German in the Persian of a note stands in asterisks, as in every other Persian text', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      exams[1].links[1].note = { en: 'With the recordings.', fa: 'همراه با فایل‌های Hören است.', de: 'Mit Hörtexten.' }
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAMS,
      where: '[1].links[1].note.fa',
      message: 'German outside asterisks: "Hören". A Persian page shows it in the wrong order; write *Hören*',
    },
  ])
})

test('the Persian of a note is held to the spelling of every Persian text', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      exams[1].links[1].note = { en: 'With the recordings.', fa: 'همراه با فايل‌های صوتی است.', de: 'Mit Hörtexten.' }
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: EXAMS,
      where: '[1].links[1].note.fa',
      message: 'Arabic letter "ي" in Persian text: write the Persian "ی"',
    },
  ])
})

test('the pages of the candidate sheets run from a first page to a later last page', async () => {
  const content = await fixtureContentWith({
    [EXAMS]: changeExams((exams) => {
      exams[0].links[0].candidatePages = { first: 28, last: 7 }
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: EXAMS, where: '[0].links[0].candidatePages.last', message: 'must not be before the first page (28)' },
  ])
})

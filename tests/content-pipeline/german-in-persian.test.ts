import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

const CHAPTERS = 'chapters.yaml'

test('Persian text with German outside asterisks is rejected, and the report shows the German', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.title.fa = 'پایانهٔ -st با *du*'
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'title.fa',
      message: 'German outside asterisks: "-st". A Persian page shows it in the wrong order; write *-st*',
    },
  ])
  expect(bundle).toBeNull()
})

test('German outside asterisks is found in every Persian text that can mark German', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.explanations.fa.rule = 'ستاک wohnen می‌شود *wohn-*.'
      node.mistakes[0].why.fa = 'با du پایانه *-st* است.'
      node.questions[1].explanation.fa = 'با *du* پایانه st است.'
    }),
    [CHAPTERS]: (text) => text.replace('با *sein*', 'با sein و *haben*'),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ file, question, where, message }) => [file, question, where, message])).toEqual([
    [PUBLISHED, undefined, 'explanations.fa.rule', expect.stringContaining('"wohnen"')],
    [PUBLISHED, undefined, 'mistakes[0].why.fa', expect.stringContaining('"du"')],
    [PUBLISHED, 'q2', 'questions[1].explanation.fa', expect.stringContaining('"st"')],
    [CHAPTERS, undefined, '[1].title.fa', expect.stringContaining('"sein"')],
  ])
})

test('an asterisk without its partner leaves the German after it unmarked', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.title.fa = 'فعل *sein در گذشته'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'title.fa',
      message: 'German outside asterisks: "sein". A Persian page shows it in the wrong order; write *sein*',
    },
  ])
})

test('English and German text may hold German without asterisks', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.title.en = 'The ending -st with du'
      node.title.de = 'Die Endung -st bei du'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})

import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, changeReviewedNode, fixtureContentWith, PUBLISHED, VOCABULARY } from './fixture.ts'

// The rules are content/persian-style.md, "Spelling".

test('Persian text with an Arabic ي or ك is rejected, and the report names the Persian letter to write', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.title.fa = 'فعل *sein* در زمان گذشتهٔ ساده براي هر شخص'
    }),
    [PUBLISHED]: changeNode((node) => {
      node.explanations.fa.rule = 'فعل با *ich* شناسهٔ *-e* مي‌گيرد، با *du* شناسهٔ *-st*. كار مي‌كند.'
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors.map(({ file, where, message }) => [file, where, message])).toEqual([
    [PUBLISHED, 'explanations.fa.rule', 'Arabic letter "ي" in Persian text: write the Persian "ی"'],
    [COMING_SOON, 'title.fa', 'Arabic letter "ي" in Persian text: write the Persian "ی"'],
  ])
  expect(bundle).toBeNull()
})

test('a number in Persian text is written in Persian digits; German in asterisks keeps its own', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.explanations.fa.rule = 'این بخش ۷ امتیاز دارد و *um 8 Uhr* شروع می‌شود.'
      node.mistakes[0].why.fa = 'این بخش 7 امتیاز دارد.'
      node.questions[1].explanation.fa = 'پاسخ ٣ درست است.'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ question, where, message }) => [question, where, message])).toEqual([
    [undefined, 'mistakes[0].why.fa', 'Latin digit "7" in Persian text: write Persian digits (۰ to ۹)'],
    ['q2', 'questions[1].explanation.fa', 'Arabic digit "٣" in Persian text: write Persian digits (۰ to ۹)'],
  ])
})

test('the prefix می and the plural ها are joined with a half-space, not a space', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.explanations.fa.rule = 'فعل با *ich* شناسهٔ *-e* می گیرد.'
      node.mistakes[0].why.fa = 'شناسه ها را جدا نکنید.'
      node.questions[0].explanation.fa = 'این را نمی دانیم.'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ where, message }) => [where, message])).toEqual([
    ['explanations.fa.rule', 'A space after "می" in Persian text: join it with a half-space (U+200C), "می\u200c"'],
    ['mistakes[0].why.fa', 'A space before "ها" in Persian text: join it with a half-space (U+200C), "\u200cها"'],
    [
      'questions[0].explanation.fa',
      'A space after "نمی" in Persian text: join it with a half-space (U+200C), "نمی\u200c"',
    ],
  ])
})

test('the Persian headings of a table are held to the same spelling', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.table.columns[1].fa = 'شكل'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ file, where, message }) => [file, where, message])).toEqual([
    [PUBLISHED, 'table.columns[1].fa', 'Arabic letter "ك" in Persian text: write the Persian "ک"'],
  ])
})

test('the meaning of a word and the title of a chapter are held to the same spelling', async () => {
  const content = await fixtureContentWith({
    [VOCABULARY]: changeReviewedNode((node) => {
      node.words[0].meaning.fa = 'ميز'
    }),
    'chapters.yaml': (text) => text.replace('با *sein*', 'با *sein* مي'),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ file, where, message }) => [file, where, message])).toEqual([
    [VOCABULARY, 'words[0].meaning.fa', 'Arabic letter "ي" in Persian text: write the Persian "ی"'],
    ['chapters.yaml', '[1].title.fa', 'Arabic letter "ي" in Persian text: write the Persian "ی"'],
  ])
})

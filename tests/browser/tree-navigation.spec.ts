import type { Page } from '@playwright/test'
import { type ChapterOfTopics, serveCurriculum } from './curriculum.ts'
import { takeTest } from './taking-a-test.ts'
import { expect, test } from './test.ts'

/** The row of a topic in the tree: its link to the page and, beside it, its link to the test. */
const row = (page: Page, title: string) =>
  page.getByRole('main').getByRole('group').getByRole('listitem').filter({ hasText: title })
const topicLink = (page: Page, title: string) => row(page, title).getByRole('link', { name: new RegExp(title) })
const testLink = (page: Page, title: string) => row(page, title).getByRole('link', { name: 'Test', exact: true })

const nextTopic = (page: Page) => page.getByRole('region', { name: 'Your next topic' })
const levelOnStrip = (page: Page, level: string) =>
  page.getByRole('navigation', { name: 'Levels' }).getByRole('link', { name: new RegExp(level) })
const kindChoice = (page: Page, kind: string) =>
  page.getByRole('navigation', { name: 'Kinds of topic' }).getByRole('link', { name: new RegExp(kind) })
const chapters = (page: Page) => page.getByRole('main').getByRole('group')
const chapter = (page: Page, name: string) => chapters(page).filter({ hasText: name })

/**
 * A tree of three levels and three kinds. Only "Fixture verbs" (grammar-001)
 * has a page and a test; the rest are there to be counted, filtered and
 * skipped. In curriculum order the written topics are grammar-001, v4, e1.
 */
const WAY: ChapterOfTopics[] = [
  { level: 'A1', kind: 'grammar', name: 'Verbs', topics: ['g0 soon', 'grammar-001', 'g2 soon'] },
  { level: 'A1', kind: 'vocabulary', name: 'Home words', topics: ['v1 soon', 'v2 soon'] },
  { level: 'A2', kind: 'grammar', name: 'Cases', topics: ['g3 soon'] },
  { level: 'A2', kind: 'vocabulary', name: 'Town words', topics: ['v3 soon', 'v4'] },
  { level: 'B1', kind: 'exam-part', name: 'Writing', topics: ['e1 no-test'] },
]

test('a learner takes a test straight from the tree, without opening the topic’s page, and the topic is done', async ({
  page,
}) => {
  const pagesOpened: string[] = []
  page.on('framenavigated', (frame) => pagesOpened.push(new URL(frame.url()).hash))

  await page.goto('./')
  await expect(topicLink(page, 'Fixture verbs')).toContainText('Start')

  await testLink(page, 'Fixture verbs').click()
  await takeTest(page, () => 'right')
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(topicLink(page, 'Fixture verbs')).toContainText('Done')
  await expect(topicLink(page, 'Fixture verbs')).not.toContainText('Start')
  // The topic's own page was never on the way.
  expect(pagesOpened).toContain('#/node/grammar-001/test')
  expect(pagesOpened).not.toContain('#/node/grammar-001')
})

test('a topic whose test was taken but not passed is in progress: the tree says "Continue"', async ({ page }) => {
  await page.goto('./')
  await testLink(page, 'Fixture verbs').click()
  await takeTest(page, () => 'wrong')
  await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible()

  await page.goto('./')

  await expect(topicLink(page, 'Fixture verbs')).toContainText('Continue')
  await expect(topicLink(page, 'Fixture verbs')).not.toContainText('Start')
  await expect(topicLink(page, 'Fixture verbs')).not.toContainText('Done')
  await expect(nextTopic(page).getByRole('link', { name: 'Continue' })).toBeVisible()
})

test('a topic that is not written yet has no test to start, and a topic without a test offers none', async ({
  page,
}) => {
  await serveCurriculum(page, WAY)
  await page.goto('./')

  await expect(row(page, 'Topic g2')).toContainText('Coming soon')
  await expect(row(page, 'Topic g2').getByRole('link')).toHaveCount(0)

  await levelOnStrip(page, 'B1').click()
  await expect(topicLink(page, 'Topic e1')).toContainText('Start')
  await expect(testLink(page, 'Topic e1')).toHaveCount(0)
})

test('the next recommended topic is highlighted; after its test it moves on, past topics not written yet, into another kind and level', async ({
  page,
}) => {
  await serveCurriculum(page, WAY)
  await page.goto('./')

  // The first topic of the tree is not written yet, so the way starts at the second.
  await expect(nextTopic(page)).toContainText('Fixture verbs')
  await expect(nextTopic(page)).toContainText('A1')
  await expect(nextTopic(page)).toContainText('Grammar')
  await expect(nextTopic(page)).toContainText('Verbs')
  await expect(row(page, 'Fixture verbs')).toContainText('Your next topic')
  await expect(chapters(page).getByText('Your next topic')).toHaveCount(1)

  await nextTopic(page).getByRole('link', { name: 'Take the test' }).click()
  await takeTest(page, () => 'right')
  await page.getByRole('link', { name: 'All topics' }).click()

  // The next written topic is vocabulary of A2: three "coming soon" topics lie in between.
  await expect(nextTopic(page)).toContainText('Topic v4')
  await expect(nextTopic(page)).toContainText('A2')
  await expect(nextTopic(page)).toContainText('Vocabulary')
  await expect(nextTopic(page)).toContainText('Town words')
  // The tree still shows A1, as the learner left it: nothing there is next any more.
  await expect(topicLink(page, 'Fixture verbs')).toContainText('Done')
  await expect(chapters(page).getByText('Your next topic')).toHaveCount(0)
})

test('the tree opens where the learner is: "You are here" on the level, and the chapter of the next topic open', async ({
  page,
}) => {
  await serveCurriculum(page, WAY)
  await page.goto('./')

  await expect(levelOnStrip(page, 'A1')).toContainText('You are here')
  await expect(levelOnStrip(page, 'A1')).toHaveAttribute('aria-current', 'true')
  await expect(levelOnStrip(page, 'A2')).not.toContainText('You are here')
  await expect(chapter(page, 'Verbs')).toContainText('You are here')
  await expect(chapter(page, 'Home words')).not.toContainText('You are here')
  await expect(row(page, 'Fixture verbs')).toBeVisible()
  await expect(row(page, 'Topic v1')).toBeHidden()

  await testLink(page, 'Fixture verbs').click()
  await takeTest(page, () => 'right')
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  // A fresh visit: the learner is in A2 now, in its second chapter.
  await page.goto('./')

  await expect(page.getByRole('heading', { level: 2, name: /^A2/ })).toBeVisible()
  await expect(levelOnStrip(page, 'A2')).toContainText('You are here')
  await expect(levelOnStrip(page, 'A2')).toHaveAttribute('aria-current', 'true')
  await expect(levelOnStrip(page, 'A1')).not.toContainText('You are here')
  await expect(chapter(page, 'Town words')).toContainText('You are here')
  await expect(row(page, 'Topic v4')).toBeVisible()
  await expect(row(page, 'Topic v4')).toContainText('Your next topic')
  await expect(row(page, 'Topic g3')).toBeHidden()
})

test('counts of done and remaining topics are shown per level and per kind, and follow a passed test', async ({
  page,
}) => {
  await serveCurriculum(page, WAY)
  await page.goto('./')

  // Per level. A topic that is not written yet is still left to do.
  await expect(levelOnStrip(page, 'A1')).toContainText('0 done')
  await expect(levelOnStrip(page, 'A1')).toContainText('5 left')
  await expect(levelOnStrip(page, 'A2')).toContainText('3 left')
  await expect(levelOnStrip(page, 'B1')).toContainText('1 left')
  await expect(page.getByText('0 done · 5 left, 4 of them coming soon')).toBeVisible()
  // Per kind, in the level that is shown.
  await expect(kindChoice(page, 'All kinds')).toContainText('0 done · 5 left')
  await expect(kindChoice(page, 'Grammar')).toContainText('0 done · 3 left')
  await expect(kindChoice(page, 'Vocabulary')).toContainText('0 done · 2 left')
  // Per chapter.
  await expect(chapter(page, 'Verbs').locator('summary')).toContainText('0 of 3 done')
  await expect(chapter(page, 'Verbs').locator('summary')).toContainText('2 coming soon')

  await testLink(page, 'Fixture verbs').click()
  await takeTest(page, () => 'right')
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(levelOnStrip(page, 'A1')).toContainText('1 done')
  await expect(levelOnStrip(page, 'A1')).toContainText('4 left')
  await expect(levelOnStrip(page, 'A2')).toContainText('0 done')
  await expect(page.getByText('1 done · 4 left, 4 of them coming soon')).toBeVisible()
  await expect(kindChoice(page, 'Grammar')).toContainText('1 done · 2 left')
  await expect(kindChoice(page, 'Vocabulary')).toContainText('0 done · 2 left')
  await expect(chapter(page, 'Verbs').locator('summary')).toContainText('1 of 3 done')
})

test('the tree filters by level and by kind', async ({ page }) => {
  await serveCurriculum(page, WAY)
  await page.goto('./')
  await expect(chapters(page)).toHaveCount(2)
  // A kind is offered when the tree has topics of it.
  await expect(kindChoice(page, 'Exam parts')).toBeVisible()
  await expect(kindChoice(page, 'Phrases')).toHaveCount(0)

  await kindChoice(page, 'Vocabulary').click()

  await expect(chapters(page)).toHaveCount(1)
  await expect(chapters(page).getByRole('heading', { level: 3 })).toHaveText('Home words')
  await expect(kindChoice(page, 'Vocabulary')).toHaveAttribute('aria-current', 'true')
  // The counts on the levels are now those of the chosen kind.
  await expect(levelOnStrip(page, 'A1')).toContainText('2 left')
  await expect(levelOnStrip(page, 'B1')).toContainText('0 left')
  await expect(page.getByText('0 done · 2 left, 2 of them coming soon')).toBeVisible()

  // Another level keeps the kind.
  await levelOnStrip(page, 'A2').click()

  await expect(chapters(page).getByRole('heading', { level: 3 })).toHaveText('Town words')
  await expect(kindChoice(page, 'Vocabulary')).toHaveAttribute('aria-current', 'true')

  await kindChoice(page, 'Exam parts').click()

  await expect(chapters(page)).toHaveCount(0)
  await expect(page.getByText('This level has no topics of this kind.')).toBeVisible()

  await kindChoice(page, 'All kinds').click()

  await expect(chapters(page).getByRole('heading', { level: 3 })).toHaveText(['Cases', 'Town words'])
  // The filter never hides the next step.
  await expect(nextTopic(page)).toContainText('Fixture verbs')
})

test('coming back from a topic, the level and the kind are as the learner chose them', async ({ page }) => {
  await serveCurriculum(page, WAY)
  await page.goto('./')
  await kindChoice(page, 'Grammar').click()
  await expect(chapters(page)).toHaveCount(1)

  await topicLink(page, 'Fixture verbs').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture verbs' })).toBeVisible()
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(kindChoice(page, 'Grammar')).toHaveAttribute('aria-current', 'true')
  await expect(chapters(page)).toHaveCount(1)
})

test('a tree of about 370 topics, nearly all of them not written yet, stays one screen wide and opens one chapter', async ({
  page,
}) => {
  const topics = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i + 1} soon`)
  const big: ChapterOfTopics[] = ['A1', 'A2', 'B1'].flatMap((level) => [
    ...Array.from({ length: 6 }, (_, place): ChapterOfTopics => {
      const written = level === 'A1' && place === 0
      return {
        level,
        kind: 'grammar',
        name: `${level} grammar chapter ${place + 1} with a long name that has to wrap on a phone`,
        topics: [
          ...(written ? ['grammar-001'] : []),
          `${level}-a-topic-with-a-very-long-title-that-must-wrap-inside-its-row-${place}-soon soon`,
          ...topics(`${level}-g${place}-`, written ? 10 : 11),
        ],
      }
    }),
    { level, kind: 'vocabulary', name: `${level} words`, topics: topics(`${level}-v`, 40) },
    { level, kind: 'phrases', name: `${level} phrases`, topics: topics(`${level}-p`, 7) },
    { level, kind: 'exam-part', name: `${level} exam parts`, topics: topics(`${level}-e`, 4) },
  ])
  await serveCurriculum(page, big)
  const sidewaysScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  await page.goto('./')

  await expect(page.getByRole('heading', { level: 2, name: /123 topics/ })).toBeVisible()
  await expect(page.getByText('0 done · 123 left, 122 of them coming soon')).toBeVisible()
  await expect(chapters(page)).toHaveCount(9)
  // One chapter is open, not the whole level.
  await expect(chapters(page).getByRole('listitem').filter({ visible: true })).toHaveCount(12)
  expect(await sidewaysScroll()).toBe(0)

  // Every chapter open, and a kind chosen: still one screen wide, also in Persian.
  for (const closed of await chapters(page).locator('summary').all()) {
    if ((await closed.locator('..').getAttribute('open')) === null) await closed.click()
  }
  expect(await sidewaysScroll()).toBe(0)
  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  expect(await sidewaysScroll()).toBe(0)
  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  expect(await sidewaysScroll()).toBe(0)
})

test('a topic shows what it builds on, and opens and can be passed whether or not those topics are done', async ({
  page,
}) => {
  await serveCurriculum(page, [
    { level: 'A1', kind: 'grammar', name: 'Basics', topics: ['g0', 'g1 soon', 'grammar-001 after:g0 after:g1'] },
  ])
  await page.goto('./')
  // The way would start with another topic; the learner opens this one anyway.
  await expect(nextTopic(page)).toContainText('Topic g0')

  await topicLink(page, 'Fixture verbs').click()

  const buildsOn = page.getByRole('region', { name: 'Builds on' })
  await expect(buildsOn.getByRole('link')).toHaveText(['Topic g0', 'Topic g1'])
  await expect(buildsOn.getByRole('listitem').filter({ hasText: 'Topic g1' })).toContainText('Coming soon')
  await expect(buildsOn).toContainText('Nothing is locked.')
  await expect(page.getByRole('heading', { name: 'Rule' })).toBeVisible()

  await page.getByRole('link', { name: 'Take the test' }).click()
  await takeTest(page, () => 'right')
  await expect(page.getByText('This topic is now done.')).toBeVisible()
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(topicLink(page, 'Fixture verbs')).toContainText('Done')
  await expect(topicLink(page, 'Topic g0')).toContainText('Start')
  await expect(nextTopic(page)).toContainText('Topic g0')
})

test('a learner un-marks a done topic: it is in progress again, and next on the way', async ({ page }) => {
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await expect(page.getByRole('heading', { name: 'Passed' })).toBeVisible()
  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(nextTopic(page)).not.toContainText('Fixture verbs')
  await topicLink(page, 'Fixture verbs').click()
  const done = page.getByRole('main').getByText('Done', { exact: true })
  await expect(done).toBeVisible()

  // It asks first, and "no" changes nothing.
  await page.getByRole('button', { name: 'Mark as not done' }).click()
  await page.getByRole('button', { name: 'Keep it done' }).click()
  await expect(done).toBeVisible()

  await page.getByRole('button', { name: 'Mark as not done' }).click()
  await page.getByRole('button', { name: 'Yes, mark as not done' }).click()

  await expect(done).toBeHidden()
  await expect(page.getByRole('status')).toHaveText('This topic is not done any more.')
  await expect(page.getByRole('button', { name: 'Mark as not done' })).toBeHidden()

  await page.getByRole('link', { name: 'All topics' }).click()
  await expect(topicLink(page, 'Fixture verbs')).toContainText('Continue')
  await expect(nextTopic(page)).toContainText('Fixture verbs')

  await page.reload()

  await expect(topicLink(page, 'Fixture verbs')).toContainText('Continue')
})

test('a first visit explains the tree in three steps; once dismissed they stay away', async ({ page }) => {
  await page.goto('./')
  const steps = page.getByRole('region', { name: 'How it works' })

  await expect(steps.getByRole('listitem')).toHaveText([
    /Pick a topic\./,
    /Read it, or go straight to the test\./,
    /Score 90% and the topic is done\./,
  ])

  await steps.getByRole('button', { name: 'Got it' }).click()

  await expect(steps).toBeHidden()
  await expect(nextTopic(page)).toBeVisible()

  await page.reload()

  await expect(nextTopic(page)).toBeVisible()
  await expect(steps).toBeHidden()
})

test('with every written topic done, the tree says so instead of naming a next topic', async ({ page }) => {
  await page.goto('./#/node/grammar-001/test')
  await takeTest(page, () => 'right')
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(nextTopic(page)).toContainText('You have done every topic that is written so far.')
  await expect(nextTopic(page).getByRole('link')).toHaveCount(0)
  // The learner is still in A1: its other topic is yet to be written.
  await expect(levelOnStrip(page, 'A1')).toContainText('You are here')
})

test('the tree has no streaks, points, reminders or daily goals', async ({ page }) => {
  await serveCurriculum(page, WAY)
  await page.goto('./')
  await expect(nextTopic(page)).toBeVisible()

  await expect(page.locator('body')).not.toContainText(/streak|points?\b|reminder|daily|goal|badge|\bxp\b/i)

  await testLink(page, 'Fixture verbs').click()
  await takeTest(page, () => 'right')
  await page.getByRole('link', { name: 'All topics' }).click()

  await expect(topicLink(page, 'Fixture verbs')).toContainText('Done')
  await expect(page.locator('body')).not.toContainText(/streak|points?\b|reminder|daily|goal|badge|\bxp\b/i)
})

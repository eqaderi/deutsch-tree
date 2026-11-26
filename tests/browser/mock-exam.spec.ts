import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { parse } from 'yaml'
import { itemsOnScreen } from './taking-a-task.ts'
import { expect, test } from './test.ts'

/**
 * The original mock exams, against the fixture's: `mock-exam-1` is published
 * with Lesen (5 parts, 30 items), Hören (4 parts, 30 items), Schreiben (3
 * tasks) and Sprechen (3 parts); `mock-exam-2` is coming soon. The answer key comes from the fixture file, read here on
 * its own; the app only gets the compiled bundle.
 */
const LIST = './#/mock-exams'
const LESEN = './#/mock-exams/mock-exam-1/lesen'
const HOEREN = './#/mock-exams/mock-exam-1/hoeren'
const SCHREIBEN = './#/mock-exams/mock-exam-1/schreiben'
const SPRECHEN = './#/mock-exams/mock-exam-1/sprechen'

interface FixtureItem {
  id: string
  type: 'richtig-falsch' | 'multiple-choice' | 'ja-nein' | 'which-text' | 'who-says'
  answer: boolean | string
  options?: string[]
}
interface FixturePart {
  texts: Array<{ id: string; speakers?: Array<{ name: string }> }>
  items: FixtureItem[]
}

async function fixtureModule(module: 'lesen' | 'hoeren'): Promise<FixturePart[]> {
  const file = fileURLToPath(new URL('../fixtures/content/mock-exams/mock-exam-1.yaml', import.meta.url))
  return (parse(await readFile(file, 'utf8')) as Record<string, FixturePart[]>)[module] ?? []
}

/** The label of the option that answers `item`, right or wrong. */
function optionFor(item: FixtureItem, part: FixturePart, right: boolean): string {
  switch (item.type) {
    case 'richtig-falsch':
      return (item.answer === true) === right ? 'Richtig' : 'Falsch'
    case 'ja-nein':
      return (item.answer === true) === right ? 'Ja' : 'Nein'
    case 'multiple-choice': {
      const options = item.options ?? []
      return right ? String(item.answer) : (options.find((option) => option !== item.answer) ?? '')
    }
    case 'which-text': {
      const options = [...part.texts.map((text) => text.id), '0']
      return right ? String(item.answer) : (options.find((option) => option !== String(item.answer)) ?? '')
    }
    case 'who-says': {
      const speakers = part.texts.flatMap((text) => (text.speakers ?? []).map((one) => one.name))
      return right ? String(item.answer) : (speakers.find((name) => name !== item.answer) ?? '')
    }
  }
}

/** Shows a part of the module on screen. */
async function showPart(page: Page, part: number) {
  await page
    .getByRole('navigation', { name: 'Parts' })
    .getByRole('button', { name: `Part ${part}`, exact: true })
    .click()
}

/** Text on the screen; the other parts of a module, and the prompt, stay on the page hidden. */
const shown = (page: Page, text: string) => page.getByText(text, { exact: false }).filter({ visible: true })

/** Types the assistant's score of each part into the part's own box, part by part. */
async function enterScores(page: Page, scores: string[]) {
  for (const [index, score] of scores.entries()) {
    await showPart(page, index + 1)
    await page.getByRole('textbox', { name: /Score from the assistant/ }).fill(score)
    await page.getByRole('button', { name: 'Save the score' }).click()
    await expect(shown(page, `Score: ${score} of 100`)).toBeVisible()
  }
}

/**
 * Answers every part of the module on screen, part by part, from the key:
 * right, except `wrong[part]` items at the end of each part.
 */
async function answerModule(page: Page, parts: FixturePart[], wrong: number[] = []) {
  for (const [partIndex, part] of parts.entries()) {
    await page
      .getByRole('navigation', { name: 'Parts' })
      .getByRole('button', { name: `Part ${partIndex + 1}`, exact: true })
      .click()
    const items = itemsOnScreen(page)
    await expect(items).toHaveCount(part.items.length)
    const wrongFrom = part.items.length - (wrong[partIndex] ?? 0)
    for (const [index, item] of part.items.entries()) {
      await items
        .nth(index)
        .getByRole('radio', { name: optionFor(item, part, index < wrongFrom), exact: true })
        .check()
    }
  }
}

test('the exam stop of the tree leads to the mock exams; one that is still being written is marked', async ({
  page,
}) => {
  await page.goto('./#/?level=B2')
  await page.getByRole('link', { name: 'Mock exams for practice' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Mock exams' })).toBeVisible()
  const published = page.getByRole('region', { name: 'Fixture mock exam', exact: true })
  await expect(published.getByRole('link', { name: /Reading.*30 questions · 65 minutes/ })).toBeVisible()
  await expect(published.getByRole('link', { name: /Listening.*30 questions · 40 minutes/ })).toBeVisible()
  await expect(published.getByRole('link', { name: /Writing.*3 tasks · 60 minutes/ })).toBeVisible()
  await expect(published.getByRole('link', { name: /Speaking.*3 tasks · 15 minutes/ })).toBeVisible()
  await expect(published).toContainText('No results yet.')
  const soon = page.getByRole('region', { name: 'Second fixture mock exam' })
  await expect(soon).toContainText('Coming soon')
  await expect(soon.getByRole('link')).toHaveCount(0)
})

test('a learner takes Lesen from start to finish and sees each part and the score out of 100, kept in the history', async ({
  page,
}) => {
  await page.goto(LESEN)
  await expect(page.getByRole('heading', { level: 1, name: /Reading/ })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Use the time limit of the exam: 65 minutes' }).uncheck()
  await page.getByRole('button', { name: 'Start the module' }).click()

  // Teil 3 shows its ten advertisements, each with the letter its items name it by.
  await page.getByRole('navigation', { name: 'Parts' }).getByRole('button', { name: 'Part 3' }).click()
  await expect(page.getByRole('heading', { level: 3, name: 'j Fotostudio' })).toBeVisible()

  // 27 of 30 right: one wrong in each of Teil 2, Teil 3 and Teil 5.
  await answerModule(page, await fixtureModule('lesen'), [0, 1, 1, 0, 1])
  await page.getByRole('button', { name: /Finish and check/ }).click()

  const result = page.getByRole('region', { name: /: your result$/ })
  await expect(result.locator('.big-number')).toHaveText('90')
  await expect(result).toContainText('of 100')
  await expect(result).toContainText('At your target of 90 or more.')
  await expect(result).toContainText('without a time limit')
  for (const [part, right] of ['6 of 6', '5 of 6', '6 of 7', '7 of 7', '3 of 4'].entries()) {
    await expect(result.getByRole('definition').nth(part)).toHaveText(right)
    await expect(result.getByRole('term').nth(part)).toHaveText(`Part ${part + 1}`)
  }
  // Each part's answers can be looked at again, with the right answer and the reason.
  await page.getByText('Part 2: your answers').click()
  await expect(page.getByRole('list', { name: 'Your answers' }).first()).toContainText('Question 12')

  // The history keeps it, also after a reload.
  await page.goto(LIST)
  await page.reload()
  const exam = page.getByRole('region', { name: 'Fixture mock exam', exact: true })
  await expect(exam.getByRole('link', { name: /Reading.*Last time: 90 of 100/ })).toBeVisible()
  await expect(exam.getByRole('list', { name: 'Your results' }).getByRole('listitem')).toHaveCount(1)
})

test('a second try is added to the history, the latest first, and a score under 60 says it did not pass', async ({
  page,
}) => {
  const parts = await fixtureModule('lesen')
  await page.goto(LESEN)
  for (const wrong of [
    [0, 0, 0, 0, 0],
    [6, 6, 0, 0, 0],
  ]) {
    if (wrong[0] !== 0) await page.getByRole('button', { name: 'Take it again' }).click()
    await page.getByRole('button', { name: 'Start the module' }).click()
    await answerModule(page, parts, wrong)
    await page.getByRole('button', { name: /Finish and check/ }).click()
    await expect(page.getByRole('region', { name: /: your result$/ })).toContainText('with the time limit')
  }

  // 18 of 30 is 60, the pass mark; 30 of 30 is 100.
  await expect(page.getByRole('region', { name: /: your result$/ })).toContainText('Passed: 60 is the pass mark.')
  await page.goto(LIST)
  const history = page.getByRole('list', { name: 'Your results' }).getByRole('listitem')
  await expect(history).toHaveCount(2)
  await expect(history.nth(0).locator('.big-number')).toHaveText('60')
  await expect(history.nth(1).locator('.big-number')).toHaveText('100')
})

test('when the time limit is over, the answers so far are checked', async ({ page }) => {
  await page.clock.install()
  await page.goto(LESEN)
  await page.getByRole('button', { name: 'Start the module' }).click()
  await expect(page.getByRole('timer')).toHaveText('65:00')
  const [teil1] = await fixtureModule('lesen')
  if (!teil1) throw new Error('the fixture has no Lesen, Teil 1')
  await answerModule(page, [teil1])

  await page.clock.fastForward('01:05:01')

  const result = page.getByRole('region', { name: /: your result$/ })
  await expect(result).toContainText('The time is up. Your answers so far were checked.')
  // Six of thirty: 20 out of 100.
  await expect(result.locator('.big-number')).toHaveText('20')
  await expect(result).toContainText('Not passed. You pass with 60, and your target is 90.')
})

test('the timer can be switched off while the module runs', async ({ page }) => {
  await page.goto(LESEN)
  await page.getByRole('button', { name: 'Start the module' }).click()
  await expect(page.getByRole('timer')).toBeVisible()

  await page.getByRole('button', { name: 'Switch the timer off' }).click()

  await expect(page.getByRole('timer')).toHaveCount(0)
  await page.getByRole('button', { name: /Finish and check/ }).click()
  await expect(page.getByRole('region', { name: /: your result$/ })).toContainText('without a time limit')
})

test('in Hören the recordings play as often as in the exam, and the discussion has three voices', async ({ page }) => {
  await page.goto(HOEREN)
  await expect(page.getByRole('heading', { level: 1, name: /Listening/ })).toBeVisible()
  await page.getByRole('button', { name: 'Start the module' }).click()

  // Teil 2 is heard once.
  const parts = page.getByRole('navigation', { name: 'Parts' })
  await parts.getByRole('button', { name: 'Part 2' }).click()
  await expect(page.getByText('Plays left: 1').filter({ visible: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play the recording' }).click()
  await expect(page.getByText('No plays left').filter({ visible: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play the recording' })).toBeDisabled()

  // Teil 4 is heard twice; who says what is chosen among the three speakers.
  await parts.getByRole('button', { name: 'Part 4' }).click()
  await expect(page.getByText('Plays left: 2').filter({ visible: true })).toBeVisible()
  await expect(
    itemsOnScreen(page)
      .first()
      .getByRole('radio', { name: /^(Moderatorin|Herr Wolf|Frau Roth)$/ }),
  ).toHaveCount(3)

  await answerModule(page, await fixtureModule('hoeren'))
  await page.getByRole('button', { name: /Finish and check/ }).click()

  const result = page.getByRole('region', { name: /: your result$/ })
  await expect(result.locator('.big-number')).toHaveText('100')
  for (const [part, right] of ['10 of 10', '5 of 5', '7 of 7', '8 of 8'].entries()) {
    await expect(result.getByRole('definition').nth(part)).toHaveText(right)
  }
  // What was said is shown once the answers are checked.
  await page.getByText('Part 4: your answers').click()
  await expect(page.getByText('Mir fehlen zu Hause meine Kollegen.', { exact: false })).toBeVisible()
})

test('in Schreiben each task has its prompt to copy and a box for its score; the result is out of 100 and kept', async ({
  page,
}) => {
  await page.goto(SCHREIBEN)
  await expect(page.getByRole('heading', { level: 1, name: /Writing/ })).toBeVisible()
  await expect(page.getByRole('region', { name: '3 tasks · 60 minutes' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Use the time limit of the exam: 60 minutes' }).uncheck()
  await page.getByRole('button', { name: 'Start the module' }).click()

  // Each task as the learner reads it, and its prompt with the task and the official criteria.
  await expect(shown(page, 'Schreiben, Aufgabe 1')).toBeVisible()
  await expect(shown(page, 'Ihr Freund Tim war nicht dabei.')).toBeVisible()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy the prompt' }).click()
  const prompt = await page.evaluate(() => navigator.clipboard.readText())
  expect(prompt).toContain('Machen Sie einen Vorschlag für den nächsten Ausflug.')
  expect(prompt).toContain('Erfüllung')
  expect(prompt).toContain('SCORE: <number>/100')
  await showPart(page, 2)
  await expect(shown(page, 'Schreiben, Aufgabe 2')).toBeVisible()
  await expect(shown(page, 'Ein Auto brauche ich nicht.')).toBeVisible()

  await enterScores(page, ['81', '75', '75'])
  await page.getByRole('button', { name: /Finish and check.*3 of 3 scores entered/ }).click()

  // 32.4 + 30 + 15 of the 40 + 40 + 20 points of the tasks.
  const result = page.getByRole('region', { name: /: your result$/ })
  await expect(result.locator('.big-number')).toHaveText('77')
  await expect(result).toContainText('Passed: 60 is the pass mark.')
  for (const [part, points] of ['32 of 40', '30 of 40', '15 of 20'].entries()) {
    await expect(result.getByRole('definition').nth(part)).toHaveText(points)
  }
  // Below the result: the score typed in for each task.
  await expect(page.getByRole('region', { name: 'The scores you entered' })).toContainText('81 of 100')

  await page.goto(LIST)
  await page.reload()
  const exam = page.getByRole('region', { name: 'Fixture mock exam', exact: true })
  await expect(exam.getByRole('link', { name: /Writing.*Last time: 77 of 100/ })).toBeVisible()
})

test('in Sprechen the time running out ends the speaking, not the module: the scores can still be entered', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto(SPRECHEN)
  await page.getByRole('button', { name: 'Start the module' }).click()
  await expect(page.getByRole('timer')).toHaveText('15:00')
  await expect(shown(page, 'Sprechen, Teil 1: Gemeinsam etwas planen')).toBeVisible()

  await page.clock.fastForward('15:01')

  await expect(page.getByRole('main')).toContainText('The time is up.')
  await enterScores(page, ['75', '75'])
  await page.getByRole('button', { name: /Finish and check.*2 of 3 scores entered/ }).click()

  // 25 of 33 and 36 of 48; Teil 3 has no score, so 0 of 19.
  const result = page.getByRole('region', { name: /: your result$/ })
  await expect(result.locator('.big-number')).toHaveText('61')
  for (const [part, points] of ['25 of 33', '36 of 48', '0 of 19'].entries()) {
    await expect(result.getByRole('definition').nth(part)).toHaveText(points)
  }
  await expect(result).not.toContainText('Your answers so far were checked.')
})

test('the history of an exam keeps all four modules, each out of 100', async ({ page }) => {
  for (const module of [LESEN, HOEREN]) {
    await page.goto(module)
    await page.getByRole('button', { name: 'Start the module' }).click()
    await page.getByRole('button', { name: /Finish and check/ }).click()
    await expect(page.getByRole('region', { name: /: your result$/ })).toBeVisible()
  }
  for (const [module, scores] of [
    [SCHREIBEN, ['90', '90', '90']],
    [SPRECHEN, ['100', '100', '100']],
  ] as const) {
    await page.goto(module)
    await page.getByRole('button', { name: 'Start the module' }).click()
    await enterScores(page, [...scores])
    await page.getByRole('button', { name: /Finish and check/ }).click()
    await expect(page.getByRole('region', { name: /: your result$/ })).toBeVisible()
  }

  await page.goto(LIST)
  await page.reload()
  const history = page.getByRole('list', { name: 'Your results' }).getByRole('listitem')
  await expect(history).toHaveCount(4)
  await expect(history.locator('.mock-result-head')).toContainText(['Speaking', 'Writing', 'Listening', 'Reading'])
  await expect(history.locator('.big-number')).toHaveText(['100', '90', '0', '0'])
})

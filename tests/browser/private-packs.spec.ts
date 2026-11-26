import type { Page } from '@playwright/test'
import { expect, test } from './test.ts'

/**
 * Private packs. The site under /deutsch-tree/ is the built site as it is
 * published. Under /local/ the same files are served from a folder that also
 * holds a `private` folder with the fixture pack, as the start file serves
 * them on a learner's computer (see playwright.config.ts). The pack is built
 * from the synthetic book of tests/pack-builder/fixture.ts; its answers are
 * the lines of that book's key.
 */
const LOCAL = '/local/'

/** The answers of exam 1 in the fixture book's key, by module and part. */
const KEY = {
  lesen: {
    2: ['a', 'c', 'b', 'b', 'a', 'c'],
  },
  hoeren: {
    1: ['falsch', 'b', 'richtig', 'a', 'richtig', 'c', 'falsch', 'a', 'falsch', 'b'],
    2: ['c', 'a', 'b', 'b', 'a'],
    3: ['richtig', 'falsch', 'falsch', 'richtig', 'falsch', 'richtig', 'richtig'],
    4: ['a', 'c', 'b', 'b', 'a', 'c', 'a', 'b'],
  },
} as const

async function openModule(page: Page, module: 'Lesen' | 'Hören') {
  await page.goto(`${LOCAL}#/packs`)
  await page
    .getByRole('region', { name: 'Fixture book' })
    .getByRole('listitem')
    .filter({ hasText: 'Exam 1' })
    .getByRole('link', { name: module })
    .click()
}

/** Marks the answer sheet on screen: one choice for each item, from the given number on. */
async function markSheet(page: Page, firstItem: number, choices: readonly string[]) {
  const sheet = page.getByRole('region', { name: 'Answer sheet' })
  for (const [index, choice] of choices.entries()) {
    await sheet
      .getByRole('radiogroup', { name: `Item ${firstItem + index}` })
      .getByRole('radio', { name: choice, exact: true })
      .check()
  }
}

test('without a pack, the app explains where to put one', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Your exam books' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Your exam books' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No exam book found' })).toBeVisible()
  await expect(page.getByText(/into the folder named “private”/)).toBeVisible()
  await expect(page.getByText(/never appear on the public website/)).toBeVisible()
})

test('the published site holds no pack material', async ({ request }) => {
  for (const file of ['private/packs.json', 'private/fixture-book/pack.json', 'private/fixture-book/answers.json']) {
    expect((await request.get(`./${file}`)).status(), file).toBe(404)
    // The same file is in the folder that holds the pack, so the check above can fail.
    expect((await request.get(`${LOCAL}${file}`)).ok(), file).toBe(true)
  }
})

test('a pack in the private folder appears with no configuration', async ({ page }) => {
  await page.goto(`${LOCAL}#/packs`)

  const pack = page.getByRole('region', { name: 'Fixture book' })
  await expect(pack).toBeVisible()
  await expect(pack.getByText('2 exams')).toBeVisible()
  await expect(page.getByText('No exam book found')).toHaveCount(0)
  for (const exam of ['Exam 1', 'Exam 2']) {
    const row = pack.getByRole('listitem').filter({ hasText: exam })
    await expect(row.getByRole('link')).toHaveText(['Lesen', 'Hören', 'Schreiben', 'Sprechen'])
  }
})

test("a reading part shows the book's pages beside an answer sheet and is scored from the answer key", async ({
  page,
}) => {
  await openModule(page, 'Lesen')
  await page.getByRole('link', { name: 'Part 2', exact: true }).click()

  // Part 2 of exam 1 is on pages 3 and 4 of the book, and on no other.
  const pages = page.getByRole('region', { name: 'Pages of the book' })
  await expect(pages.getByRole('figure')).toHaveCount(2)
  await expect(pages.getByRole('figure', { name: 'Page 3 of the book' }).getByText('Fixture page 3')).toBeAttached()
  await expect(pages.getByRole('figure', { name: 'Page 4 of the book' }).getByText('Fixture page 4')).toBeAttached()

  const wrongLast = [...KEY.lesen[2].slice(0, 5), 'b']
  await markSheet(page, 7, wrongLast)
  await page.getByRole('button', { name: /Check answers/ }).click()

  const result = page.getByRole('region', { name: 'Result of part 2' })
  await expect(result.getByText('83', { exact: true })).toBeVisible()
  await expect(result.getByText('of 100')).toBeVisible()
  await expect(result.getByText('5 of 6 right')).toBeVisible()
  const item12 = result.getByRole('listitem').filter({ hasText: 'Item 12' })
  await expect(item12).toContainText('Your answer is wrong')
  await expect(item12).toContainText('Your answerb')
  await expect(item12).toContainText('Right answerc')
})

test('a listening part plays its recording, and the module is scored out of 100 once every part is checked', async ({
  page,
}) => {
  await openModule(page, 'Hören')

  const player = page.getByRole('region', { name: 'Recording' })
  const audio = player.locator('audio')
  await expect(audio).toHaveAttribute('src', /private\/fixture-book\/exams\/01\/hoeren-1\.mp3$/)
  const duration = await audio.evaluate(
    (element: HTMLAudioElement) =>
      new Promise<number>((resolve, reject) => {
        if (element.readyState >= 1) resolve(element.duration)
        element.addEventListener('loadedmetadata', () => resolve(element.duration))
        element.addEventListener('error', () => reject(new Error(`audio error ${element.error?.code}`)))
        element.load()
      }),
  )
  expect(duration).toBeGreaterThan(0)

  const parts = [KEY.hoeren[1], KEY.hoeren[2], KEY.hoeren[3], KEY.hoeren[4]]
  let firstItem = 1
  for (const [index, answers] of parts.entries()) {
    const part = index + 1
    if (part > 1) await page.getByRole('link', { name: `Part ${part}`, exact: true }).click()
    await expect(page.getByRole('region', { name: 'Recording' }).locator('audio')).toHaveAttribute(
      'src',
      new RegExp(`hoeren-${part}\\.mp3$`),
    )
    // One mistake, in part 3.
    const marked = part === 3 ? ['falsch', ...answers.slice(1)] : answers
    await markSheet(page, firstItem, marked)
    await page.getByRole('button', { name: /Check answers/ }).click()
    await expect(page.getByRole('region', { name: `Result of part ${part}` })).toBeVisible()
    firstItem += answers.length
  }

  const module = page.getByRole('region', { name: /Hören.*: your result/ })
  await expect(module.getByText('97', { exact: true })).toBeVisible()
  await expect(module.getByText('29 of 30 right')).toBeVisible()
  await expect(module.getByRole('term')).toHaveText(['Part 1', 'Part 2', 'Part 3', 'Part 4'])
  await expect(module.getByRole('definition')).toHaveText(['10 of 10', '5 of 5', '6 of 7', '8 of 8'])
})

import type { Page } from '@playwright/test'
import { audioRequests, listen } from './listening.ts'
import { expect, test } from './test.ts'

/**
 * Hearing German: every German example has a play button that plays the
 * stored audio file. The fixture's audio files are a quarter of a second of
 * silence each, named by the key of what they say.
 */

/** The audio of "Ich wohne in Berlin.", the first example of the fixture node grammar-001 (see tests/content-pipeline/audio.test.ts). */
const ICH_WOHNE_IN_BERLIN = '16af11d6bd373d3d'

const examples = (page: Page) => page.getByRole('region', { name: 'Examples' }).getByRole('listitem')

test('every German example of a grammar page has a play button, and no audio loads until one is pressed', async ({
  page,
}) => {
  const asked = audioRequests(page)
  await page.goto('./#/node/grammar-001')

  await expect(examples(page)).toHaveCount(2)
  for (const example of await examples(page).all()) {
    await expect(example.getByRole('button', { name: 'Listen' })).toBeVisible()
  }
  await page.waitForLoadState('networkidle')
  expect(asked).toEqual([])
})

test('pressing play plays the stored audio of that example, not the browser’s own speech', async ({ page }) => {
  const asked = audioRequests(page)
  const heard = await listen(page)
  await page.goto('./#/node/grammar-001')

  const first = examples(page).first()
  await first.getByRole('button', { name: 'Listen' }).click()

  await expect.poll(() => asked).toEqual([`audio/${ICH_WOHNE_IN_BERLIN}.mp3`])
  await expect.poll(async () => (await heard()).played).toEqual([`audio/${ICH_WOHNE_IN_BERLIN}.mp3`])
  // Played to its end, the button offers to listen again.
  await expect(first.getByRole('button', { name: 'Listen' })).toBeVisible()
  await expect(first).not.toContainText('could not be played')
  expect((await heard()).builtInSpeech).toEqual([])
})

test('a vocabulary word can be heard with its article, and so can its example sentence', async ({ page }) => {
  await page.goto('./#/node/vocabulary-fixture-home')

  const tisch = page.getByRole('list', { name: 'Words' }).getByRole('listitem').first()
  await expect(tisch.getByRole('button', { name: 'Listen' })).toHaveCount(2)
  // Ten words, each with its own example.
  await expect(page.getByRole('list', { name: 'Words' }).getByRole('button', { name: 'Listen' })).toHaveCount(22)
})

test('every phrase can be heard, and so can its example', async ({ page }) => {
  await page.goto('./#/node/phrases-greeting')

  // Three phrases, each with a button for itself (in its heading) and one for its example.
  const list = page.getByRole('list', { name: 'Phrases' })
  await expect(list.getByRole('button', { name: 'Listen' })).toHaveCount(6)
  const names = list.getByRole('heading', { level: 3 })
  await expect(names).toHaveCount(3)
  for (const name of await names.all()) await expect(name.getByRole('button', { name: 'Listen' })).toHaveCount(1)
})

test('the right sentence of a common mistake can be heard; the wrong one cannot', async ({ page }) => {
  await page.goto('./#/node/grammar-001')

  const mistakes = page.getByRole('region', { name: 'Common mistakes' }).getByRole('listitem')
  await expect(mistakes.first()).toBeVisible()
  for (const mistake of await mistakes.all()) {
    await expect(mistake.getByRole('button', { name: 'Listen' })).toHaveCount(1)
  }
})

test('a file that cannot be loaded says so, and the page goes on working', async ({ page }) => {
  await page.route(`**/content/audio/${ICH_WOHNE_IN_BERLIN}.mp3`, (route) => route.fulfill({ status: 404 }))
  await page.goto('./#/node/grammar-001')

  const first = examples(page).first()
  await first.getByRole('button', { name: 'Listen' }).click()

  await expect(first).toContainText('The audio could not be played.')
  await expect(first.getByRole('button', { name: 'Listen' })).toBeVisible()
})

test('the voice that needs a credit is credited on every page', async ({ page }) => {
  await page.goto('./')

  await expect(page.getByRole('contentinfo')).toContainText('Kerstin')
  await expect(page.getByRole('contentinfo')).toContainText('Hi-Fi TTS')
  await expect(page.getByRole('contentinfo')).toContainText('Cori Samuel')
})

test('in Persian the play button is named in Persian', async ({ page }) => {
  await page.goto('./#/node/grammar-001')
  await page.getByRole('button', { name: 'فارسی' }).click()

  const persianExamples = page.getByRole('region', { name: 'مثال‌ها' }).getByRole('listitem')
  await expect(persianExamples.first().getByRole('button', { name: 'گوش دادن' })).toBeVisible()
})

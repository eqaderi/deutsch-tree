import type { Page } from '@playwright/test'
import { audioRequests, lineFiles, listen } from './listening.ts'
import { LISTENING, taskOnScreen } from './taking-a-task.ts'
import { expect, test } from './test.ts'

/**
 * The voice a learner chooses for everything one person says: the male
 * voice (Thorsten) or the female voice (Kerstin). A conversation keeps the
 * voices of its speakers. The keys are pinned in the pipeline's tests
 * (tests/content-pipeline/audio.test.ts).
 */

/** "Ich wohne in Berlin.", the first example of grammar-001, in each voice. */
const ICH_WOHNE_IN_BERLIN = { thorsten: '16af11d6bd373d3d', kerstin: '7610892bd4157192' }
/** "der Tisch", the first word of vocabulary-fixture-home, in each voice. */
const DER_TISCH = { thorsten: 'a22a5e6927988b84', kerstin: '84bae78c624b0298' }

const voiceSetting = (page: Page, name = 'Voice') => page.getByRole('contentinfo').getByRole('group', { name })
const firstExample = (page: Page) => page.getByRole('region', { name: 'Examples' }).getByRole('listitem').first()

test('the voice is chosen at the foot of every page, and the male voice is chosen at first', async ({ page }) => {
  for (const address of ['./', './#/node/grammar-001', './#/backup']) {
    await page.goto(address)
    await expect(voiceSetting(page).getByRole('button', { name: 'Male (Thorsten)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(voiceSetting(page).getByRole('button', { name: 'Female (Kerstin)' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  }
})

test('with the female voice chosen, every play button plays Kerstin, also after a reload', async ({ page }) => {
  const asked = audioRequests(page)
  await page.goto('./#/node/grammar-001')

  await firstExample(page).getByRole('button', { name: 'Listen' }).click()
  await expect.poll(() => asked).toEqual([`audio/${ICH_WOHNE_IN_BERLIN.thorsten}.mp3`])

  await voiceSetting(page).getByRole('button', { name: 'Female (Kerstin)' }).click()
  await firstExample(page).getByRole('button', { name: 'Listen' }).click()
  await expect.poll(() => asked.at(-1)).toBe(`audio/${ICH_WOHNE_IN_BERLIN.kerstin}.mp3`)

  await page.reload()
  await expect(voiceSetting(page).getByRole('button', { name: 'Female (Kerstin)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.goto('./#/node/vocabulary-fixture-home')
  const tisch = page.getByRole('list', { name: 'Words' }).getByRole('listitem').first()
  await tisch.getByRole('button', { name: 'Listen' }).first().click()
  await expect.poll(() => asked.at(-1)).toBe(`audio/${DER_TISCH.kerstin}.mp3`)
})

test('a conversation keeps its two speakers’ voices whatever voice is chosen', async ({ page }) => {
  const heard = await listen(page)
  await page.goto('./')
  await voiceSetting(page).getByRole('button', { name: 'Female (Kerstin)' }).click()

  await page.goto('./#/node/exam-hoeren-3/test')
  const [conversation] = (await taskOnScreen(page, 'Questions', LISTENING)).texts
  if (!conversation?.lines) throw new Error('the fixture listening task has no conversation')
  await page.getByRole('button', { name: 'Play the recording' }).click()

  await expect.poll(async () => (await heard()).played, { timeout: 15_000 }).toEqual(lineFiles(conversation))
})

test('the voice setting is named in Persian and in German', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('button', { name: 'فارسی' }).click()
  // The names stay in Latin letters, kept apart from the Persian around them.
  await expect(voiceSetting(page, 'صدا').getByRole('button')).toHaveText([
    /^مرد \(.?Thorsten.?\)$/,
    /^زن \(.?Kerstin.?\)$/,
  ])

  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(voiceSetting(page, 'Stimme').getByRole('button')).toHaveText([
    'Männlich (Thorsten)',
    'Weiblich (Kerstin)',
  ])
})

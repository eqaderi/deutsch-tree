import { createHash } from 'node:crypto'
import type { Page } from '@playwright/test'
import { listen } from './listening.ts'
import { answerTask, type FixtureText, itemsOnScreen, LISTENING, taskOnScreen } from './taking-a-task.ts'
import { expect, test } from './test.ts'

/**
 * A listening part: the practice task is a conversation that the learner
 * hears, each line in its speaker's voice, and seven statements about it.
 */
const PART = './#/node/exam-hoeren-3'
const PRACTICE = './#/node/exam-hoeren-3/test'

/**
 * Where the audio of each line of a conversation is served, in the order of
 * the lines. The file is named by the key of the voice and the words, as
 * README "Audio" defines it (pinned to known keys in the pipeline's tests).
 */
function lineFiles(text: FixtureText): string[] {
  const voiceOf = new Map(text.speakers?.map((speaker) => [speaker.name, speaker.voice]))
  return (text.lines ?? []).map((line) => {
    const key = createHash('sha256')
      .update(`${voiceOf.get(line.speaker)}\n${line.text}`)
      .digest('hex')
      .slice(0, 16)
    return `/deutsch-tree/content/audio/${key}.mp3`
  })
}

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('a listening task plays the whole conversation, line after line in two voices, and hides what is said', async ({
  page,
}) => {
  const heard = await listen(page)
  await page.goto(PART)
  await page.getByRole('link', { name: 'Start the practice task' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Practice: Fixture listening, part 3' })).toBeVisible()
  const task = await taskOnScreen(page, 'Questions', LISTENING)
  const [conversation] = task.texts
  if (!conversation?.lines) throw new Error('the fixture listening task has no conversation')
  // The candidate hears the conversation and reads only the statements.
  await expect(page.getByRole('region', { name: 'Recording' })).toBeVisible()
  await expect(page.getByRole('main')).not.toContainText(conversation.lines[0]?.text ?? '')
  await expect(itemsOnScreen(page)).toContainText(task.items.map((item) => item.prompt))

  await page.getByRole('button', { name: 'Play the recording' }).click()

  await expect(page.getByRole('button', { name: 'Stop the recording' })).toBeVisible()
  await expect.poll(async () => (await heard()).played, { timeout: 15_000 }).toEqual(lineFiles(conversation))
  await expect(page.getByRole('button', { name: 'Play the recording' })).toBeVisible()
  expect((await heard()).builtInSpeech).toEqual([])
})

test('the recording can be stopped before its end', async ({ page }) => {
  const heard = await listen(page)
  await page.goto(PRACTICE)
  await taskOnScreen(page, 'Questions', LISTENING)

  await page.getByRole('button', { name: 'Play the recording' }).click()
  await page.getByRole('button', { name: 'Stop the recording' }).click()

  await expect(page.getByRole('button', { name: 'Play the recording' })).toBeVisible()
  const playedAtStop = (await heard()).played.length
  await page.waitForTimeout(1_000)
  expect((await heard()).played.length).toBe(playedAtStop)
  expect(playedAtStop).toBeLessThan(8)
})

test('the answers of a listening task are scored per item, and then the learner reads and hears what was said', async ({
  page,
}) => {
  await page.goto(PRACTICE)

  const task = await answerTask(page, (place) => (place === 3 ? 'wrong' : 'right'), 'Questions', LISTENING)
  await page.getByRole('button', { name: 'Check answers' }).click()

  // Seven items: the pass mark is all seven.
  await expect(page.getByRole('heading', { name: 'Not passed' })).toBeFocused()
  await expect(page.getByRole('main')).toContainText('6 of 7 right')
  const results = itemsOnScreen(page, 'Your answers')
  await expect(results).toHaveCount(7)
  for (const [index, result] of (await results.all()).entries()) {
    await expect(result).toContainText(index === 2 ? 'Your answer is wrong' : 'Your answer is right')
  }
  await expect(results.nth(2)).toContainText('Right answer')

  // What was said, line by line, each with who says it and its own play button.
  const [conversation] = task.texts
  const transcript = page.getByRole('region', { name: 'What is said' })
  const lines = transcript.getByRole('listitem')
  await expect(lines).toHaveCount(conversation?.lines?.length ?? 0)
  const first = conversation?.lines?.[0]
  await expect(lines.first()).toContainText(`${first?.speaker}`)
  await expect(lines.first()).toContainText(`${first?.text}`)
  await expect(lines.first().locator('[lang="de"]').first()).toHaveAttribute('dir', 'ltr')
  await expect(transcript.getByRole('button', { name: 'Listen' })).toHaveCount(conversation?.lines?.length ?? 0)
  await expect(transcript.getByRole('button', { name: 'Play the recording' })).toBeVisible()
  expect(await sidewaysScroll(page)).toBe(0)

  // A retry takes the other conversation.
  await page.getByRole('button', { name: 'Try again' }).click()
  const next = await taskOnScreen(page, 'Questions', LISTENING)
  expect(next.id).not.toBe(task.id)
})

test('a listening task passed in full marks the part done', async ({ page }) => {
  await page.goto(PRACTICE)

  await answerTask(page, () => 'right', 'Questions', LISTENING)
  await page.getByRole('button', { name: 'Check answers' }).click()

  await expect(page.getByRole('heading', { name: 'Passed' })).toBeFocused()
  await expect(page.getByRole('main')).toContainText('7 of 7 right')
  await expect(page.getByText('This topic is now done.')).toBeVisible()
})

test('in Persian the button of the recording is named in Persian', async ({ page }) => {
  await page.goto(PRACTICE)
  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('button', { name: 'پخش فایل صوتی' })).toBeVisible()
  expect(await sidewaysScroll(page)).toBe(0)
})

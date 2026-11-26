/**
 * Helpers for journeys that take the practice task of an exam part.
 *
 * The answer key comes from the fixture node file, read here on its own; the
 * app only ever gets the compiled bundle. Which task is on screen is told by
 * the "report a problem" links of its items, which name the task and the item.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { parse } from 'yaml'
import { reportedIssue, reportLink } from './taking-a-test.ts'
import { expect } from './test.ts'

export interface FixtureItem {
  id: string
  prompt: string
  /** true: the statement is right according to the text. */
  answer: boolean
  explanation: { en: string; fa: string; de: string }
}

/** A text of a fixture task: one to read (`body`), or one to hear (`speakers` and `lines`). */
export interface FixtureText {
  id: string
  title: string
  body?: string
  speakers?: Array<{ name: string; voice: string }>
  lines?: Array<{ speaker: string; text: string }>
}

export interface FixtureTask {
  id: string
  texts: FixtureText[]
  items: FixtureItem[]
}

/** A fixture exam part with practice tasks, and how many items each of its tasks has. */
export interface FixturePart {
  node: string
  items: number
}

/** "Fixture reading, part 1": Lesen, Teil 1. */
export const READING: FixturePart = { node: 'exam-lesen-1', items: 6 }
/** "Fixture listening, part 3": Hören, Teil 3. */
export const LISTENING: FixturePart = { node: 'exam-hoeren-3', items: 7 }

/** How many items a task of the fixture reading part has. */
export const ITEMS = READING.items

/** The practice tasks of a fixture exam part. */
export async function fixtureTasks(part: FixturePart = READING): Promise<FixtureTask[]> {
  const file = fileURLToPath(new URL(`../fixtures/content/nodes/exam-part/${part.node}.yaml`, import.meta.url))
  return (parse(await readFile(file, 'utf8')) as { practice: FixtureTask[] }).practice
}

/** The items of the task on screen, while it is answered and in its result. */
export function itemsOnScreen(page: Page, listName = 'Questions'): Locator {
  return page.getByRole('list', { name: listName }).getByRole('listitem')
}

/** The fixture task that is on screen now. */
export async function taskOnScreen(page: Page, listName = 'Questions', part = READING): Promise<FixtureTask> {
  await expect(itemsOnScreen(page, listName)).toHaveCount(part.items)
  const { node, question } = await reportedIssue(reportLink(itemsOnScreen(page, listName).first()))
  expect(node).toBe(part.node)
  const found = (await fixtureTasks(part)).find((task) => question === `${task.id}/${task.items[0]?.id}`)
  if (!found) throw new Error(`the task on screen (item ${question}) is not a task of ${part.node}`)
  return found
}

/** The word on the answer sheet for an answer: the exam's own, in every language. */
export function answerWord(answer: boolean): 'Richtig' | 'Falsch' {
  return answer ? 'Richtig' : 'Falsch'
}

/**
 * Answers every item of the task on screen, right or wrong as `how` says for
 * each place (from 1), and returns the task. It does not ask for the result.
 */
export async function answerTask(
  page: Page,
  how: (place: number) => 'right' | 'wrong',
  listName = 'Questions',
  part = READING,
): Promise<FixtureTask> {
  const task = await taskOnScreen(page, listName, part)
  for (const [index, item] of task.items.entries()) {
    const given = how(index + 1) === 'right' ? item.answer : !item.answer
    await itemsOnScreen(page, listName)
      .nth(index)
      .getByRole('radio', { name: answerWord(given), exact: true })
      .check()
  }
  return task
}

import type { Page } from '@playwright/test'
import { expect, test } from './test.ts'

// In the fixture, grammar-102 "Fixture plurals" (A2) is a published recognise-only topic,
// and grammar-201 (B1) is a recognise-only topic that is not written yet.

const row = (page: Page, title: string) =>
  page.getByRole('main').getByRole('group').getByRole('listitem').filter({ hasText: title })
const levelOnStrip = (page: Page, level: string) =>
  page.getByRole('navigation', { name: 'Levels' }).getByRole('link', { name: new RegExp(level) })

/** Opens a chapter of the tree, if it is not open already. */
async function openChapter(page: Page, name: string) {
  const chapter = page.getByRole('main').getByRole('group').filter({ hasText: name })
  if ((await chapter.getAttribute('open')) === null) await chapter.locator('summary').click()
}

test('a recognise-only topic says so in the tree, written or not, and an ordinary topic does not', async ({ page }) => {
  await page.goto('./')
  await levelOnStrip(page, 'A2').click()
  await openChapter(page, 'Fixture nouns')
  await expect(row(page, 'Fixture plurals').getByRole('link', { name: /Fixture plurals/ })).toContainText(
    'Recognise only',
  )
  await expect(row(page, 'Fixture articles')).not.toContainText('Recognise only')

  await levelOnStrip(page, 'B1').click()
  await openChapter(page, 'Fixture level not written yet')
  await expect(row(page, 'Fixture topic of a later level')).toContainText('Recognise only')
  await expect(row(page, 'Fixture topic of a later level')).toContainText('Coming soon')
})

test('a recognise-only topic’s page and its test say that only understanding is asked', async ({ page }) => {
  await page.goto('./#/node/grammar-102')

  const head = page.locator('header.page-head')
  await expect(head).toContainText('Recognise only')
  await expect(head).toContainText('You only need to understand this when you read or hear it.')

  await page.getByRole('link', { name: 'Take the test' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Test: Fixture plurals' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('Recognise only')
  await expect(page.getByRole('main')).toContainText('This test only asks whether you understand the form.')
})

test('the label is in the learner’s language', async ({ page }) => {
  await page.goto('./#/node/grammar-102')
  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.locator('header.page-head')).toContainText('فقط در حد شناختن')

  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page.locator('header.page-head')).toContainText('Nur verstehen')
})

test('an ordinary topic carries no such label', async ({ page }) => {
  await page.goto('./#/node/grammar-101')
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture articles' })).toBeVisible()
  await expect(page.getByRole('main')).not.toContainText('Recognise only')
})

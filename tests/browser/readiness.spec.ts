import { readFile, writeFile } from 'node:fs/promises'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './test.ts'

/**
 * The fixture lists four invented official mock exams: two for adults, a
 * youth set that counts toward readiness and a youth set that does not.
 * Their links lead nowhere and are only ever read here, never followed: the
 * app itself sends nothing to another server (tests/browser/test.ts).
 */
const ADULTS_1 = 'Fixture-Modellsatz Erwachsene'
const ADULTS_2 = 'Fixture-Übungssatz Erwachsene'
const YOUTH_1 = 'Fixture-Modellsatz Jugendliche'
const YOUTH_2 = 'Fixture-Übungssatz Jugendliche'

const exam = (page: Page, title: string) => page.getByRole('region', { name: title })
const linksOut = (scope: Page | Locator) => scope.locator('a[href^="https://"]:not([href*="github.com"])')
const missing = (page: Page) => page.getByRole('list', { name: 'What is missing' }).getByRole('listitem')

interface Scores {
  reading?: string
  listening?: string
  writing?: string
  speaking?: string
}

/** Opens the score fields of an exam, fills them in as given (an absent module is left empty) and saves. */
async function recordScores(page: Page, title: string, scores: Scores, words = ENGLISH): Promise<void> {
  const card = exam(page, title)
  await card.getByRole('button', { name: words.open }).click()
  await card.getByLabel(words.reading).fill(scores.reading ?? '')
  await card.getByLabel(words.listening).fill(scores.listening ?? '')
  await card.getByLabel(words.writing).fill(scores.writing ?? '')
  await card.getByLabel(words.speaking).fill(scores.speaking ?? '')
  await card.getByRole('button', { name: words.save }).click()
}

const ENGLISH = {
  open: /Record scores|Change scores/,
  reading: /Reading/,
  listening: /Listening/,
  writing: /Writing/,
  speaking: /Speaking/,
  save: 'Save scores',
}

const PERSIAN = {
  open: /ثبت نمره‌ها|تغییر نمره‌ها/,
  reading: /خواندن/,
  listening: /شنیدن/,
  writing: /نوشتن/,
  speaking: /صحبت‌کردن/,
  save: 'ذخیرهٔ نمره‌ها',
}

const all = (score: string): Scores => ({ reading: score, listening: score, writing: score, speaking: score })

/** The last level of the fixture content: its line in the tree ends with the exam. */
const LAST_LEVEL = './#/?level=B1'

test('the last level ends with the exam: the readiness rule, the warning, and the way to the readiness view', async ({
  page,
}) => {
  await page.goto('./')
  const stop = page.getByRole('region', { name: 'The exam' })
  const examInStrip = page.getByRole('navigation', { name: 'Levels' }).getByRole('link', { name: 'Exam' })

  // An earlier level ends with its checkpoint. The way to the readiness view
  // is "Exam" at the end of the strip of levels, which every level shows.
  await expect(page.getByRole('region', { name: 'A1 checkpoint' })).toBeVisible()
  await expect(stop).toHaveCount(0)
  await expect(examInStrip).toHaveAttribute('href', '#/readiness')

  await page.getByRole('navigation', { name: 'Levels' }).getByRole('link', { name: 'B1' }).click()

  // The last level: its checkpoint, and after it the exam.
  await expect(stop).toContainText('You are ready when you have 90 or more in every module on 2 official mock exams.')
  await expect(stop).toContainText('Keep the official mock exams unseen until your final check.')
  await expect(stop.getByText('Not ready yet', { exact: true })).toBeVisible()
  const checkpoint = await page.getByRole('region', { name: 'B1 checkpoint' }).boundingBox()
  expect((await stop.boundingBox())?.y).toBeGreaterThan(checkpoint?.y ?? Number.POSITIVE_INFINITY)
  await expect(examInStrip).toHaveAttribute('href', '#/readiness')

  await stop.getByRole('link', { name: 'Readiness and official mock exams' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Ready for the exam?' })).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#/readiness')
})

test('the official mock exams are listed, and no link to one shows before the warning and a clear yes', async ({
  page,
}) => {
  await page.goto('./#/readiness')

  // The warning comes first, above every exam.
  const warning = page.getByRole('region', { name: 'Keep these exams unseen' })
  await expect(warning).toContainText('Do not open one, not even for a look')
  const warningBox = await warning.boundingBox()
  const firstExamBox = await exam(page, ADULTS_1).boundingBox()
  expect(warningBox?.y).toBeLessThan(firstExamBox?.y ?? 0)

  // All four sets are named; the youth sets stand apart as spares.
  for (const title of [ADULTS_1, ADULTS_2, YOUTH_1, YOUTH_2]) await expect(exam(page, title)).toBeVisible()
  const spares = page.getByRole('region', { name: 'Spare sets' })
  await expect(spares.getByRole('region')).toHaveCount(2)
  await expect(spares).toContainText('Use one only when an adult set is used up.')

  // Not one link out of the site is on the page yet.
  await expect(linksOut(page)).toHaveCount(0)

  // Asking for the links of an exam asks back first.
  const card = exam(page, ADULTS_1)
  await card.getByRole('button', { name: 'Show the links to this exam' }).click()
  await expect(card.getByText('Is this your final check?')).toBeVisible()
  await expect(card).toContainText('You can see this exam for the first time only once.')
  await expect(linksOut(page)).toHaveCount(0)

  await card.getByRole('button', { name: 'Not yet' }).click()
  await expect(card.getByText('Is this your final check?')).toBeHidden()
  await expect(linksOut(page)).toHaveCount(0)

  await card.getByRole('button', { name: 'Show the links to this exam' }).click()
  await card.getByRole('button', { name: 'Yes, show the links' }).click()

  // Now the links of this exam are there, and only of this exam.
  await expect(linksOut(page)).toHaveCount(2)
  const papers = card.getByRole('link', { name: /Exam papers \(PDF\)/ })
  await expect(papers).toHaveAttribute('href', 'https://official.example/fixture-adults-1.pdf')
  await expect(papers).toHaveAttribute('target', '_blank')
  await expect(papers).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(papers).toContainText('official.example')
  await expect(card).toContainText('Use pages 7 to 28 only.')
  const recordings = card.getByRole('link', { name: /Listening recordings/ })
  await expect(recordings).toHaveAttribute('href', 'https://recordings.example/downloads/')
  await expect(card).toContainText('On that page, look for Fixture-Modellsatz under Stufe B1.')
})

test('a learner records module scores, reads what is missing, reaches the target, and is still ready after a reload', async ({
  page,
}) => {
  await page.goto('./#/readiness')
  const verdict = page.getByRole('region', { name: 'Readiness' })

  await expect(verdict.getByRole('heading', { name: 'Not ready yet' })).toBeVisible()
  await expect(verdict).toContainText('0 of 2 official mock exams with 90 or more in every module')
  await expect(missing(page)).toHaveText(['2 more official mock exams with 90 or more in every module'])
  await expect(exam(page, ADULTS_1)).toContainText('No scores recorded yet')

  await recordScores(page, ADULTS_1, { reading: '95', listening: '92', writing: '90', speaking: '97' })

  await expect(exam(page, ADULTS_1).getByRole('definition')).toHaveText(['95', '92', '90', '97'])
  await expect(exam(page, ADULTS_1)).toContainText('Target reached: 90 or more in every module')
  await expect(verdict).toContainText('1 of 2 official mock exams')
  await expect(missing(page)).toHaveText(['1 more official mock exam with 90 or more in every module'])

  // The second exam: one module under the target, one not done yet.
  await recordScores(page, ADULTS_2, { reading: '96', listening: '94', writing: '85' })

  await expect(verdict.getByRole('heading', { name: 'Not ready yet' })).toBeVisible()
  await expect(exam(page, ADULTS_2)).toContainText('Target not reached yet')
  await expect(missing(page)).toHaveCount(2)
  await expect(missing(page).nth(0)).toHaveText('1 more official mock exam with 90 or more in every module')
  await expect(missing(page).nth(1).locator('[lang="de"]')).toHaveText(ADULTS_2)
  await expect(missing(page).nth(1)).toContainText('Writing: 85, needs 90. Speaking: not recorded.')

  // The scores of that exam are corrected and completed.
  await recordScores(page, ADULTS_2, { reading: '96', listening: '94', writing: '90', speaking: '91' })

  await expect(verdict.getByRole('heading', { name: 'Ready', exact: true })).toBeVisible()
  await expect(verdict).toContainText('2 of 2 official mock exams')
  await expect(verdict).toContainText('You can book the exam.')
  await expect(page.getByRole('list', { name: 'What is missing' })).toHaveCount(0)

  await page.reload()

  await expect(verdict.getByRole('heading', { name: 'Ready', exact: true })).toBeVisible()
  await expect(exam(page, ADULTS_2).getByRole('definition')).toHaveText(['96', '94', '90', '91'])
  await exam(page, ADULTS_2).getByRole('button', { name: 'Change scores' }).click()
  await expect(exam(page, ADULTS_2).getByLabel(/Writing/)).toHaveValue('90')

  // The tree says it too.
  await page.goto(LAST_LEVEL)
  await expect(page.getByRole('region', { name: 'The exam' }).getByText('Ready', { exact: true })).toBeVisible()
})

test('a score that is not a whole number from 0 to 100 is not saved, and the learner is told why', async ({ page }) => {
  await page.goto('./#/readiness')
  const card = exam(page, ADULTS_1)

  await recordScores(page, ADULTS_1, { reading: '95', listening: '101', writing: 'good' })

  await expect(card.getByRole('alert')).toHaveText('A score is a whole number from 0 to 100.')
  await expect(card.getByLabel(/Listening/)).toHaveAttribute('aria-invalid', 'true')
  await expect(card.getByLabel(/Writing/)).toHaveAttribute('aria-invalid', 'true')
  await expect(card.getByLabel(/Reading/)).not.toHaveAttribute('aria-invalid', 'true')

  // Nothing was saved.
  await card.getByRole('button', { name: 'Cancel' }).click()
  await expect(card).toContainText('No scores recorded yet')

  await recordScores(page, ADULTS_1, { reading: '95', listening: '100', writing: '0' })
  await expect(card.getByRole('definition')).toHaveText(['95', '100', '0', 'not recorded'])
})

test('a spare youth set counts where the list says so, and a set that does not count says so', async ({ page }) => {
  await page.goto('./#/readiness')
  const verdict = page.getByRole('region', { name: 'Readiness' })
  await expect(exam(page, YOUTH_1)).toContainText('Counts toward readiness like an adult set.')
  await expect(exam(page, YOUTH_2)).toContainText('Scores on this set do not count toward readiness.')

  await recordScores(page, ADULTS_1, all('100'))
  await recordScores(page, YOUTH_2, all('100'))

  await expect(verdict.getByRole('heading', { name: 'Not ready yet' })).toBeVisible()
  await expect(verdict).toContainText('1 of 2 official mock exams')

  await recordScores(page, YOUTH_1, all('93'))

  await expect(verdict.getByRole('heading', { name: 'Ready', exact: true })).toBeVisible()
})

test('once an exam has scores it has been seen, so its links open without the question', async ({ page }) => {
  await page.goto('./#/readiness')
  await recordScores(page, ADULTS_2, { reading: '91' })
  const card = exam(page, ADULTS_2)

  await card.getByRole('button', { name: 'Show the links to this exam' }).click()

  await expect(card.getByText('Is this your final check?')).toHaveCount(0)
  await expect(card.getByRole('link', { name: /Online version/ })).toHaveAttribute(
    'href',
    'https://official.example/online/',
  )
  await card.getByRole('button', { name: 'Hide the links' }).click()
  await expect(linksOut(page)).toHaveCount(0)
})

test('the warning is as hard to miss in Persian, and the page reads right to left with German left to right', async ({
  page,
}) => {
  await page.goto('./#/readiness')
  await page.getByRole('button', { name: 'فارسی' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('برای امتحان آماده‌اید؟')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const warning = page.getByRole('region', { name: 'این امتحان‌ها را ندیده نگه دارید' })
  await expect(warning).toContainText('آن‌ها را باز نکنید')
  await expect(linksOut(page)).toHaveCount(0)

  // The name of a set is German: it keeps its direction.
  const card = exam(page, ADULTS_1)
  const title = card.getByRole('heading', { name: ADULTS_1 }).locator('[lang="de"]')
  await expect(title).toHaveAttribute('dir', 'ltr')

  // The question before the links is Persian too.
  await card.getByRole('button', { name: 'نشان دادن لینک‌های این امتحان' }).click()
  await expect(card.getByText('این آخرین سنجش شماست؟')).toBeVisible()
  await expect(linksOut(page)).toHaveCount(0)
  await card.getByRole('button', { name: 'بله، لینک‌ها را نشان بده' }).click()
  await expect(linksOut(card)).toHaveCount(2)
  await expect(card).toContainText('فقط صفحه‌های ۷ تا ۲۸ را ببینید.')
  await expect(card.getByText('Stufe B1')).toHaveAttribute('dir', 'ltr')

  // Scores typed in Persian digits are read, and shown in Persian digits.
  await recordScores(page, ADULTS_1, { reading: '۹۵', listening: '92' }, PERSIAN)
  await expect(card.getByRole('definition')).toHaveText(['۹۵', '۹۲', 'ثبت نشده', 'ثبت نشده'])
  await expect(page.getByRole('region', { name: 'آمادگی' })).toContainText('۰ از ۲ امتحان آزمایشی رسمی')

  const sidewaysScroll = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sidewaysScroll).toBe(0)
})

test('the warning and the question before the links are there in simple German', async ({ page }) => {
  await page.goto('./#/readiness')
  await page.getByRole('button', { name: 'Deutsch' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bist du bereit für die Prüfung?')
  await expect(page.getByRole('region', { name: 'Sieh dir diese Prüfungen noch nicht an' })).toContainText(
    'Öffne keine davon',
  )

  const card = exam(page, ADULTS_1)
  await card.getByRole('button', { name: 'Links zu dieser Prüfung zeigen' }).click()
  await expect(card.getByText('Ist das dein letzter Test vor der Prüfung?')).toBeVisible()
  await expect(linksOut(page)).toHaveCount(0)

  // And on the tree.
  await page.goto(LAST_LEVEL)
  await expect(page.getByRole('region', { name: 'Die Prüfung' })).toContainText(
    'Sieh dir die offiziellen Modellprüfungen erst bei deinem letzten Test an.',
  )
})

test('the readiness view fits the screen it is opened on, with the score fields and the links open', async ({
  page,
}) => {
  await page.goto('./#/readiness')
  await recordScores(page, ADULTS_1, { reading: '95', writing: '80' })
  const card = exam(page, ADULTS_1)
  await card.getByRole('button', { name: 'Change scores' }).click()
  await card.getByRole('button', { name: 'Show the links to this exam' }).click()
  await expect(linksOut(card)).toHaveCount(2)

  const sidewaysScroll = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sidewaysScroll).toBe(0)
})

test('recorded scores are in the exported progress file and come back with an import', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('./#/readiness')
  const verdict = page.getByRole('region', { name: 'Readiness' })
  await recordScores(page, ADULTS_1, { reading: '95', listening: '92', writing: '90', speaking: '97' })
  await recordScores(page, ADULTS_2, all('91'))
  await recordScores(page, YOUTH_1, { reading: '70' })
  await expect(verdict.getByRole('heading', { name: 'Ready', exact: true })).toBeVisible()

  // Export: the file holds the scores of every exam, also of one that is not finished.
  await page.getByRole('contentinfo').getByRole('link', { name: 'Back up progress' }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  const path = testInfo.outputPath('progress.json')
  await (await downloading).saveAs(path)
  expect(JSON.parse(await readFile(path, 'utf8')).officialExams).toEqual({
    'fixture-adults-1': { reading: 95, listening: 92, writing: 90, speaking: 97 },
    'fixture-adults-2': { reading: 91, listening: 91, writing: 91, speaking: 91 },
    'fixture-youth-1': { reading: 70 },
  })

  // The browser is cleared: the scores are gone.
  await context.clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./#/readiness')
  await page.reload()
  await expect(verdict.getByRole('heading', { name: 'Not ready yet' })).toBeVisible()
  await expect(exam(page, ADULTS_1)).toContainText('No scores recorded yet')

  // Import: they are back, and the learner is ready again.
  await page.goto('./#/backup')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import a progress file' }).click()
  await (await chooser).setFiles(path)
  await expect(page.getByRole('status')).toContainText('Progress imported.')

  await page.goto('./#/readiness')
  await expect(verdict.getByRole('heading', { name: 'Ready', exact: true })).toBeVisible()
  await expect(exam(page, ADULTS_1).getByRole('definition')).toHaveText(['95', '92', '90', '97'])
  await expect(exam(page, YOUTH_1).getByRole('definition')).toHaveText([
    '70',
    'not recorded',
    'not recorded',
    'not recorded',
  ])
})

test('an import asks before it replaces recorded scores, also when no topic is done', async ({ page }, testInfo) => {
  await page.goto('./#/readiness')
  await recordScores(page, ADULTS_1, all('95'))
  const path = testInfo.outputPath('older.json')
  await writeFile(path, '{"app":"deutsch-tree","exported":"2026-11-20T12:00:00.000Z","version":1,"nodes":{}}')

  await page.goto('./#/backup')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import a progress file' }).click()
  await (await chooser).setFiles(path)

  const warning = page.getByRole('alertdialog', { name: 'Replace the progress on this device?' })
  await expect(warning).toBeVisible()
  await warning.getByRole('button', { name: 'Cancel' }).click()

  await page.goto('./#/readiness')
  await expect(exam(page, ADULTS_1).getByRole('definition')).toHaveText(['95', '95', '95', '95'])
})

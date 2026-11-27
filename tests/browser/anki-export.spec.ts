import { readFile } from 'node:fs/promises'
import type { Page, TestInfo } from '@playwright/test'
import type { CompiledNode, ContentIndex } from '../../src/content-model/index.ts'
import { takeTest } from './taking-a-test.ts'
import { expect, test } from './test.ts'

/** The fixture's published vocabulary node: eleven words about the home, "der Tisch" first. */
const NODE = 'vocabulary-fixture-home'
/** A second published vocabulary node that a journey adds to the fixture's tree. */
const OTHER = 'vocabulary-fixture-other'

const STORAGE_KEY = 'deutsch-tree:progress'
const NOTES_IN_HOME = 11

const ankiPanel = (page: Page) => page.getByRole('region', { name: 'Flashcards for Anki' })

/** Clicks a download button and gives back the name and the text of the saved file. */
async function downloadFrom(page: Page, button: string, testInfo: TestInfo): Promise<{ name: string; text: string }> {
  const downloading = page.waitForEvent('download')
  await ankiPanel(page).getByRole('button', { name: button }).click()
  const download = await downloading
  const name = download.suggestedFilename()
  const path = testInfo.outputPath(name)
  await download.saveAs(path)
  return { name, text: await readFile(path, 'utf8') }
}

/** The notes of a file: its lines that are not headers. */
const notesOf = (text: string) => text.split('\n').filter((line) => line !== '' && !line.startsWith('#'))

test('a vocabulary page saves its words as a file for Anki, with the meaning in English', async ({
  page,
}, testInfo) => {
  await page.goto(`./#/node/${NODE}`)

  const file = await downloadFrom(page, 'Download this topic', testInfo)

  expect(file.name).toBe(`deutsch-tree-anki-${NODE}.txt`)
  expect(file.text.startsWith('#separator:tab\n#html:true\n')).toBe(true)
  const notes = notesOf(file.text)
  expect(notes).toHaveLength(NOTES_IN_HOME)
  expect(notes[0]).toBe(
    'der Tisch\ttable<br><br>Das Essen steht auf dem Tisch.<br>The food is on the table.\tdeutsch-tree\tdeutsch-tree:Tisch',
  )
  expect(notes).toContainEqual(expect.stringMatching(/^die Küche\tkitchen<br>/))
  await expect(ankiPanel(page).getByRole('status')).toContainText(file.name)
})

test('in Persian the file holds the Persian meanings, marked right to left', async ({ page }, testInfo) => {
  await page.goto(`./#/node/${NODE}`)
  await page.getByRole('button', { name: 'فارسی' }).click()

  const panel = page.getByRole('region', { name: 'کارت‌های Anki' })
  const downloading = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'دانلود همین موضوع' }).click()
  const path = testInfo.outputPath('fa.txt')
  await (await downloading).saveAs(path)

  expect(notesOf(await readFile(path, 'utf8'))[0]).toBe(
    'der Tisch\t"<span dir=""rtl"">میز</span><br><br>Das Essen steht auf dem Tisch.<br><span dir=""rtl"">غذا روی میز است.</span>"\tdeutsch-tree\tdeutsch-tree:Tisch',
  )
})

test('the Anki text names the free route to a phone, in English, Persian and German', async ({ page }) => {
  await page.goto(`./#/node/${NODE}`)

  for (const { language, panel, free, computer, iPhone } of [
    { language: 'English', panel: 'Flashcards for Anki', free: 'free', computer: 'computer', iPhone: 'iPhone' },
    { language: 'فارسی', panel: 'کارت‌های Anki', free: 'رایگان', computer: 'رایانه', iPhone: 'آیفون' },
    { language: 'Deutsch', panel: 'Karteikarten für Anki', free: 'kostenlos', computer: 'Computer', iPhone: 'iPhone' },
  ]) {
    await page.getByRole('button', { name: language }).click()
    const text = page.getByRole('region', { name: panel })
    // Anki on a computer, a free AnkiWeb account, then the phone's browser at ankiweb.net, or AnkiDroid.
    for (const part of [free, computer, iPhone, 'AnkiWeb', 'ankiweb.net', 'AnkiDroid']) {
      await expect(text).toContainText(part)
    }
  }
})

test('before any vocabulary test, the export of started topics says why there is nothing to export', async ({
  page,
}) => {
  await page.goto(`./#/node/${NODE}`)

  const button = ankiPanel(page).getByRole('button', { name: 'Download all started topics' })
  await expect(button).toBeDisabled()
  await expect(button).toHaveAccessibleDescription(
    'You have not started a vocabulary topic yet. A topic counts as started once you have taken its test.',
  )
})

test('after a failed test the topic is started, and the export of started topics holds its words', async ({
  page,
}, testInfo) => {
  await page.goto(`./#/node/${NODE}/test`)
  await takeTest(page, () => 'wrong', { node: NODE })
  await page.goto(`./#/node/${NODE}`)

  const file = await downloadFrom(page, 'Download all started topics', testInfo)

  expect(file.name).toBe('deutsch-tree-anki-started.txt')
  expect(notesOf(file.text)).toHaveLength(NOTES_IN_HOME)
})

test('the export of started topics fetches their words only when asked, and lists them in curriculum order', async ({
  page,
}, testInfo) => {
  await withAnotherVocabularyNode(page)
  const asked: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/content/nodes/')) asked.push(new URL(request.url()).pathname.split('/').at(-1) ?? '')
  })
  await page.goto('./')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    STORAGE_KEY,
    JSON.stringify({
      version: 2,
      nodes: { [OTHER]: { done: true, attempts: 1 }, [NODE]: { done: false, attempts: 1 } },
    }),
  ] as const)
  // A reload, so that the app starts on the saved progress. The page is shown first, so that its
  // own request for the node is made before the count starts again (it was once counted twice).
  await page.goto(`./#/node/${NODE}`)
  await expect(ankiPanel(page)).toBeVisible()
  asked.length = 0
  await page.reload()
  await expect(ankiPanel(page)).toContainText('2 vocabulary topics started')
  expect(asked).toEqual([`${NODE}.json`])

  const file = await downloadFrom(page, 'Download all started topics', testInfo)

  expect(asked).toEqual([`${NODE}.json`, `${OTHER}.json`])
  const notes = notesOf(file.text)
  expect(notes).toHaveLength(NOTES_IN_HOME + 1)
  // The other node comes after the fixture node in the tree, so its word comes last.
  expect(notes.at(-1)).toBe(
    'der Garten\tgarden<br><br>Der Garten ist groß.<br>The garden is big.\tdeutsch-tree\tdeutsch-tree:Garten',
  )
})

/** Adds a published vocabulary node with one word to the fixture's tree, after the fixture node. */
async function withAnotherVocabularyNode(page: Page): Promise<void> {
  await page.route('**/content/index.json', async (route) => {
    const index: ContentIndex = await (await route.fetch()).json()
    const home = index.nodes.find((node) => node.id === NODE)
    if (!home) throw new Error(`no ${NODE} in the fixture index`)
    const other = { ...home, id: OTHER, order: home.order + 1 }
    index.nodes.splice(index.nodes.indexOf(home) + 1, 0, other)
    await route.fulfill({ json: index })
  })
  await page.route(`**/content/nodes/${OTHER}.json`, async (route) => {
    const response = await page.request.get(route.request().url().replace(OTHER, NODE))
    const node: CompiledNode = await response.json()
    if (!node.content || !('words' in node.content)) throw new Error(`${NODE} has no words`)
    const [first] = node.content.words
    if (!first) throw new Error(`${NODE} has no words`)
    const garten = {
      ...first,
      word: 'Garten',
      plural: 'Gärten',
      meaning: { en: 'garden', fa: 'باغ' },
      example: { de: 'Der Garten ist groß.', en: 'The garden is big.', fa: 'باغ بزرگ است.' },
    }
    await route.fulfill({ json: { ...node, id: OTHER, content: { ...node.content, words: [garten] } } })
  })
}

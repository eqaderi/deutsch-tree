import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build, type InlineConfig } from 'vite'
import { expect, test } from 'vitest'
import { keepPacksOutOfTheSite } from '../../src/pack-builder/vite-plugin.ts'

const repository = fileURLToPath(new URL('../..', import.meta.url))

test('version control ignores everything in the private folder', async () => {
  // `git check-ignore` succeeds only when the path is ignored.
  const { stdout } = await promisify(execFile)('git', ['check-ignore', 'private/some-pack/pack.json'], {
    cwd: repository,
  })

  expect(stdout.trim()).toBe('private/some-pack/pack.json')
})

const SECRET = 'text-that-only-the-pack-contains'
const NEVER_PUBLISHED = /Private packs are never published/

/** A tiny site in a temporary folder, with a pack in its private folder. */
async function siteWithPack(mainJs: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-site-'))
  await mkdir(path.join(root, 'private/some-pack'), { recursive: true })
  await writeFile(path.join(root, 'private/some-pack/pack.json'), JSON.stringify({ name: SECRET }))
  await writeFile(path.join(root, 'index.html'), '<!doctype html><script type="module" src="./main.js"></script>')
  await writeFile(path.join(root, 'main.js'), mainJs)
  return root
}

const buildSite = (root: string, config: InlineConfig = {}) =>
  build({ configFile: false, root, logLevel: 'silent', plugins: [keepPacksOutOfTheSite()], ...config })

async function builtFiles(root: string): Promise<string[]> {
  const files = await readdir(path.join(root, 'dist'), { recursive: true, withFileTypes: true })
  return files.filter((file) => file.isFile()).map((file) => path.join(file.parentPath, file.name))
}

test('a site build leaves the private folder out', async () => {
  const root = await siteWithPack('document.title = "site"')

  await buildSite(root)

  const files = await builtFiles(root)
  expect(files.length).toBeGreaterThan(0)
  for (const file of files) expect(await readFile(file, 'utf8')).not.toContain(SECRET)
})

test('a site build fails when code pulls a pack file into the site', async () => {
  const root = await siteWithPack('import pack from "./private/some-pack/pack.json"\ndocument.title = pack.name')

  await expect(buildSite(root)).rejects.toThrow(NEVER_PUBLISHED)
})

test.each([
  ['a URL built from the module address', 'document.title = new URL("./private/some-pack/pack.json", import.meta.url)'],
  ['a ?url import', 'import url from "./private/some-pack/pack.json?url"\ndocument.title = url'],
  [
    'a glob import',
    'for (const load of Object.values(import.meta.glob("./private/**/*.json"))) load().then(console.log)',
  ],
])('a site build fails when code links to a pack file with %s', async (_way, mainJs) => {
  const root = await siteWithPack(mainJs)

  await expect(buildSite(root)).rejects.toThrow(NEVER_PUBLISHED)
})

test('a site build fails when the private folder would be copied in as static files', async () => {
  const root = await siteWithPack('document.title = "site"')

  await expect(buildSite(root, { publicDir: 'private' })).rejects.toThrow(NEVER_PUBLISHED)
  await expect(buildSite(root, { publicDir: '.' })).rejects.toThrow(NEVER_PUBLISHED)
})

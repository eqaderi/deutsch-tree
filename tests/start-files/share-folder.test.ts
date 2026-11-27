import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { buildShareFolder } from '../../src/start-files/index.ts'
import { type RunningServer, startMacStartFile } from './server.ts'

let running: RunningServer | undefined
afterEach(async () => {
  await running?.stop()
  running = undefined
})

async function folderWith(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-share-'))
  for (const [file, body] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), body)
  }
  return root
}

/** A built site and a packs folder, as `pnpm build` and `pnpm pack:build` leave them. */
async function builtSiteAndPacks() {
  const siteDir = await folderWith({
    'index.html': '<!doctype html><title>deutsch-tree</title>',
    'assets/index-a1.js': 'export {}',
    'content/index.json': '{}',
    'pdfjs/wasm/openjpeg.wasm': 'wasm',
  })
  const packsDir = await folderWith({
    'a-book/pack.json': '{"id":"a-book"}',
    'a-book/answers.json': '{}',
    'a-book/audio/1-1.mp3': 'mp3',
    'packs.json': '{"format":1,"packs":["a-book"]}',
    // Not packs: the book's own files, and a folder without a pack.json.
    'exams.pdf': '%PDF book',
    'half-built/notes.txt': 'notes',
  })
  const outDir = path.join(await mkdtemp(path.join(tmpdir(), 'deutsch-tree-out-')), 'deutsch-tree')
  return { siteDir, packsDir, outDir }
}

async function filesIn(dir: string, prefix = ''): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) found.push(...(await filesIn(path.join(dir, entry.name), file)))
    else found.push(file)
  }
  return found.sort()
}

test('the shared folder holds the start files, the instructions, the built site and the packs', async () => {
  const { siteDir, packsDir, outDir } = await builtSiteAndPacks()

  const result = await buildShareFolder({ siteDir, packsDir, outDir })

  expect(result.packs).toEqual(['a-book'])
  expect(await filesIn(outDir)).toEqual([
    'Start on Mac.command',
    'Start on Windows.bat',
    'app/assets/index-a1.js',
    'app/content/index.json',
    'app/index.html',
    'app/pdfjs/wasm/openjpeg.wasm',
    'app/private/a-book/answers.json',
    'app/private/a-book/audio/1-1.mp3',
    'app/private/a-book/pack.json',
    'app/private/packs.json',
    'instructions-de.html',
    'instructions-en.html',
    'instructions-fa.html',
    'server/serve.pl',
    'server/serve.ps1',
  ])
  expect(JSON.parse(await readFile(path.join(outDir, 'app/private/packs.json'), 'utf8'))).toEqual({
    format: 1,
    packs: ['a-book'],
  })
})

test('the start files open on a double-click on a Mac and on Windows', async () => {
  const { siteDir, packsDir, outDir } = await builtSiteAndPacks()
  await buildShareFolder({ siteDir, packsDir, outDir })

  // Finder runs a .command file only when it may be executed.
  expect((await stat(path.join(outDir, 'Start on Mac.command'))).mode & 0o111).toBe(0o111)
  // cmd.exe reads a .bat file line by line with Windows line ends; Windows PowerShell 5.1
  // reads a script without a byte order mark in the old code page, so both stay ASCII.
  const bat = await readFile(path.join(outDir, 'Start on Windows.bat'), 'latin1')
  expect(bat.match(/\n/g)?.length).toBe(bat.match(/\r\n/g)?.length)
  for (const file of ['Start on Windows.bat', 'server/serve.ps1']) {
    expect(/^[\t\r\n\x20-\x7e]*$/.test(await readFile(path.join(outDir, file), 'latin1')), file).toBe(true)
  }
})

test('the Mac start file serves the app folder beside it, from wherever it is started', async () => {
  const { siteDir, packsDir, outDir } = await builtSiteAndPacks()
  await buildShareFolder({ siteDir, packsDir, outDir })

  running = await startMacStartFile(outDir)

  expect(await (await fetch(running.url)).text()).toContain('<title>deutsch-tree</title>')
  expect(await (await fetch(`${running.url}private/packs.json`)).json()).toEqual({ format: 1, packs: ['a-book'] })
})

test('building the folder again keeps a pack that was copied into it by hand', async () => {
  const { siteDir, packsDir, outDir } = await builtSiteAndPacks()
  await buildShareFolder({ siteDir, packsDir, outDir })
  await mkdir(path.join(outDir, 'app/private/by-hand'), { recursive: true })
  await writeFile(path.join(outDir, 'app/private/by-hand/pack.json'), '{"id":"by-hand"}')
  await writeFile(path.join(outDir, 'app/assets/old-build.js'), 'old')

  const result = await buildShareFolder({ siteDir, packsDir, outDir })

  expect(result.packs).toEqual(['a-book', 'by-hand'])
  const files = await filesIn(outDir)
  expect(files).toContain('app/private/by-hand/pack.json')
  expect(files).not.toContain('app/assets/old-build.js')
})

test('the folder is built without packs when there are none', async () => {
  const { siteDir, outDir } = await builtSiteAndPacks()

  const result = await buildShareFolder({ siteDir, packsDir: path.join(outDir, '..', 'no-such-folder'), outDir })

  expect(result.packs).toEqual([])
  expect(JSON.parse(await readFile(path.join(outDir, 'app/private/packs.json'), 'utf8'))).toEqual({
    format: 1,
    packs: [],
  })
})

test('it refuses to replace a folder that it did not make', async () => {
  const { siteDir, packsDir } = await builtSiteAndPacks()
  const outDir = await folderWith({ 'my-notes.txt': 'keep me' })

  await expect(buildShareFolder({ siteDir, packsDir, outDir })).rejects.toThrow(/not a folder made by pnpm share/)
  expect(await readFile(path.join(outDir, 'my-notes.txt'), 'utf8')).toBe('keep me')
})

test('version control ignores the shared folder that pnpm share writes, since it holds the packs', () => {
  // `git check-ignore` succeeds only when the path is ignored.
  const ignored = execFileSync('git', ['check-ignore', 'share/app/private/a-book/pack.json'], { encoding: 'utf8' })

  expect(ignored.trim()).toBe('share/app/private/a-book/pack.json')
})

test('it refuses a site folder that holds no built site', async () => {
  const { packsDir, outDir } = await builtSiteAndPacks()
  const siteDir = await folderWith({ 'readme.txt': 'nothing built' })

  await expect(buildShareFolder({ siteDir, packsDir, outDir })).rejects.toThrow(/pnpm build/)
})

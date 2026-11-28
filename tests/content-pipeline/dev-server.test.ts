import { readFile, realpath, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createServer, type ViteDevServer } from 'vite'
import { afterEach, expect, test, vi } from 'vitest'
import { contentPipeline } from '../../src/content-pipeline/vite-plugin.ts'
import { changeNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

// Compiling is the slow part of the dev server, so the test counts how often it happens.
const compiled = vi.hoisted(() => ({ times: 0 }))
vi.mock('../../src/content-pipeline/index.ts', async (original) => {
  const pipeline = await original<typeof import('../../src/content-pipeline/index.ts')>()
  return {
    ...pipeline,
    compileContent: (...args: Parameters<typeof pipeline.compileContent>) => {
      compiled.times += 1
      return pipeline.compileContent(...args)
    },
  }
})

let server: ViteDevServer | undefined
afterEach(async () => {
  await server?.close()
  server = undefined
})

async function devServer(contentDir: string): Promise<(file: string) => Promise<Response>> {
  server = await createServer({
    configFile: false,
    logLevel: 'silent',
    root: contentDir,
    plugins: [contentPipeline(contentDir)],
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('the dev server has no port')
  const { port } = address
  return (file) => fetch(`http://127.0.0.1:${port}/content/${file}`)
}

test('the dev server compiles the content once and serves every file from it until a content file changes', async () => {
  // The watcher names files by their real path (on a Mac the temporary folder is behind a link).
  const content = await realpath(await fixtureContentWith({}))
  const get = await devServer(content)
  compiled.times = 0

  expect((await get('index.json')).status).toBe(200)
  expect((await get('nodes/grammar-001.json')).status).toBe(200)
  expect((await get('search/en.json')).status).toBe(200)
  expect((await get('nodes/no-such-node.json')).status).toBe(404)
  expect(compiled.times).toBe(1)

  // A changed node file is compiled again, and the next request sees it.
  const file = path.join(content, PUBLISHED)
  const retitle = async (title: string) => {
    // Written beside the folder and moved in, so the file goes from its old text to its new one in one step
    // (an in-place write passes through an empty file, which the watcher may see and report on its own).
    const next = `${content}-next.yaml`
    const edit = changeNode((node) => {
      node.title.en = title
    })
    await writeFile(next, edit(await readFile(file, 'utf8')))
    await rename(next, file)
    await expect
      .poll(async () => (await (await get('nodes/grammar-001.json')).json()).title.en, { timeout: 10_000 })
      .toEqual([title])
  }
  await retitle('Changed while the server runs')
  const afterTheChange = compiled.times
  expect(afterTheChange).toBeGreaterThan(1)

  // The watcher can report one change twice (on a loaded machine it does): a file that has not changed since is not compiled again.
  server?.watcher.emit('change', file)
  server?.watcher.emit('all', 'change', file)
  await get('index.json')
  await get('nodes/grammar-001.json')
  expect(compiled.times).toBe(afterTheChange)

  // A second change to the same file is compiled again.
  await retitle('Changed a second time')
  expect(compiled.times).toBeGreaterThan(afterTheChange)
}, 20_000)

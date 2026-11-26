import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer, type ViteDevServer } from 'vite'
import { afterEach, expect, test } from 'vitest'
import { packsOnTheDevServer } from '../../src/pack-builder/vite-plugin.ts'

let server: ViteDevServer | undefined
afterEach(async () => {
  await server?.close()
  server = undefined
})

/** A dev server on a tiny project whose private folder holds the given packs, with no packs.json written. */
async function devServer(packs: string[]): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-dev-'))
  await writeFile(path.join(root, 'index.html'), '<!doctype html>')
  for (const pack of packs) {
    await mkdir(path.join(root, 'private', pack), { recursive: true })
    await writeFile(path.join(root, 'private', pack, 'pack.json'), JSON.stringify({ id: pack }))
  }
  server = await createServer({
    configFile: false,
    root,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [packsOnTheDevServer()],
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address !== 'object') throw new Error('no address')
  return `http://127.0.0.1:${address.port}`
}

test('the dev server lists the packs that the private folder holds, with nothing written by hand', async () => {
  const url = await devServer(['b-book', 'a-book'])

  const response = await fetch(`${url}/private/packs.json`)

  expect(await response.json()).toEqual({ format: 1, packs: ['a-book', 'b-book'] })
  // The pack's own files come from the folder as they are.
  expect(await (await fetch(`${url}/private/a-book/pack.json`)).json()).toEqual({ id: 'a-book' })
})

test('the dev server lists no pack when there is no private folder', async () => {
  const url = await devServer([])

  const response = await fetch(`${url}/private/packs.json`)

  expect(await response.json()).toEqual({ format: 1, packs: [] })
})

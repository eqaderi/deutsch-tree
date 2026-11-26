import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { listPacks } from '../../src/pack-builder/pack-list.ts'
import { availableServers, type RunningServer, startServer } from './server.ts'

let running: RunningServer | undefined
afterEach(async () => {
  await running?.stop()
  running = undefined
})

/** An app folder: an index.html and a private folder with the given files. */
async function appFolder(files: Record<string, string | Buffer> = {}): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-start-'))
  await writeFile(path.join(root, 'index.html'), '<!doctype html><title>app</title>')
  for (const [file, body] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), body)
  }
  return root
}

const json = (value: unknown) => JSON.stringify(value)

/** The status of a request sent byte for byte as given. */
function rawStatus(port: number, target: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => socket.write(`GET ${target} HTTP/1.1\r\nHost: x\r\n\r\n`))
    let answer = ''
    socket.on('data', (chunk) => {
      answer += chunk
    })
    socket.on('error', reject)
    socket.on('close', () => resolve(Number(answer.split(' ')[1])))
  })
}

test('a server can run here', () => {
  // Perl is on every Mac and Linux computer; without it these tests would prove nothing.
  expect(availableServers).toContain('perl')
})

describe.each(availableServers)('the %s server of the start files', (kind) => {
  test('rewrites packs.json when it starts, from the subfolders that hold a pack.json', async () => {
    const root = await appFolder({
      // A pack copied in by hand, with a stale list that does not name it.
      'private/packs.json': json({ format: 1, packs: ['gone-book'] }),
      'private/b-book/pack.json': json({ id: 'b-book' }),
      'private/a-book/pack.json': json({ id: 'a-book' }),
      'private/a-book2/pack.json': json({ id: 'a-book2' }),
      'private/a1/pack.json': json({ id: 'a1' }),
      // Not packs: no pack.json, a name that is not a pack id, a file.
      'private/empty/readme.txt': 'nothing',
      'private/My Book/pack.json': json({ id: 'my-book' }),
      'private/Upper/pack.json': json({ id: 'upper' }),
      'private/notes.txt': 'notes',
    })

    running = await startServer(kind, root)

    const expected = await listPacks(path.join(root, 'private'))
    expect(expected.packs).toEqual(['a-book', 'a-book2', 'a1', 'b-book'])
    expect(JSON.parse(await readFile(path.join(root, 'private/packs.json'), 'utf8'))).toEqual(expected)
    expect(await (await fetch(`${running.url}private/packs.json`)).json()).toEqual(expected)
  })

  test('writes an empty list, and makes the private folder, when there is no pack', async () => {
    const root = await appFolder()

    running = await startServer(kind, root)

    expect(await (await fetch(`${running.url}private/packs.json`)).json()).toEqual({ format: 1, packs: [] })
  })

  test('serves every file of the app with its type, and nothing outside the folder', async () => {
    const root = await appFolder({
      'assets/index-a1.js': 'export {}',
      'pdfjs/wasm/openjpeg.wasm': Buffer.from([0, 97, 115, 109]),
      'pdfjs/cmaps/Adobe-Japan1-0.bcmap': Buffer.from([1, 2, 3]),
      'content/index.json': json({ chapters: [] }),
      'private/a-book/pages/exam 1.pdf': '%PDF-1.7',
      'private/a-book/audio/1-1.mp3': Buffer.alloc(1000, 7),
    })
    running = await startServer(kind, root)
    const get = (file: string) => fetch(`${running?.url}${file}`)

    const types: Record<string, string> = {
      '': 'text/html; charset=utf-8',
      'index.html': 'text/html; charset=utf-8',
      'assets/index-a1.js': 'text/javascript; charset=utf-8',
      'pdfjs/wasm/openjpeg.wasm': 'application/wasm',
      'content/index.json': 'application/json; charset=utf-8',
      'private/a-book/pages/exam%201.pdf': 'application/pdf',
      'private/a-book/audio/1-1.mp3': 'audio/mpeg',
    }
    for (const [file, type] of Object.entries(types)) {
      const response = await get(file)
      expect(response.status, file).toBe(200)
      expect(response.headers.get('content-type'), file).toBe(type)
    }
    expect(Buffer.from(await (await get('pdfjs/wasm/openjpeg.wasm')).arrayBuffer())).toEqual(
      Buffer.from([0, 97, 115, 109]),
    )
    expect((await get('assets/missing.js')).status).toBe(404)
    // Sent as typed: fetch would tidy the dots away before they reach the server.
    await writeFile(path.join(path.dirname(root), `${path.basename(root)}-secret.txt`), 'secret')
    for (const outside of [`/../${path.basename(root)}-secret.txt`, `/%2e%2e/${path.basename(root)}-secret.txt`]) {
      expect(await rawStatus(running.port, outside), outside).toBe(403)
    }
  })

  test('answers partial requests, so an iPhone can play and seek a recording', async () => {
    const audio = Buffer.from(Array.from({ length: 1000 }, (_, index) => index % 256))
    const root = await appFolder({ 'private/a-book/audio/1-1.mp3': audio })
    running = await startServer(kind, root)
    const url = `${running.url}private/a-book/audio/1-1.mp3`

    const middle = await fetch(url, { headers: { range: 'bytes=100-199' } })
    expect(middle.status).toBe(206)
    expect(middle.headers.get('content-range')).toBe('bytes 100-199/1000')
    expect(Buffer.from(await middle.arrayBuffer())).toEqual(audio.subarray(100, 200))

    const rest = await fetch(url, { headers: { range: 'bytes=990-' } })
    expect(rest.headers.get('content-range')).toBe('bytes 990-999/1000')
    expect(Buffer.from(await rest.arrayBuffer())).toEqual(audio.subarray(990))

    const last = await fetch(url, { headers: { range: 'bytes=-50' } })
    expect(Buffer.from(await last.arrayBuffer())).toEqual(audio.subarray(950))

    expect((await fetch(url, { headers: { range: 'bytes=2000-' } })).status).toBe(416)
    const whole = await fetch(url)
    expect(whole.headers.get('accept-ranges')).toBe('bytes')
    expect(Buffer.from(await whole.arrayBuffer())).toEqual(audio)
  })

  test('writes the address a phone on the same network opens, and answers on it', async () => {
    const root = await appFolder()

    running = await startServer(kind, root)

    const address = JSON.parse(await readFile(path.join(root, 'private/address.json'), 'utf8'))
    expect(address).toEqual({ format: 1, phone: expect.stringMatching(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/$/) })
    const phone = new URL(address.phone)
    expect(phone.port).toBe(String(running.port))
    expect(phone.hostname).not.toMatch(/^127\./)
    expect((await fetch(phone)).status).toBe(200)
    expect(running.output()).toContain(address.phone)
  })
})

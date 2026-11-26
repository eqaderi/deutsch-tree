/**
 * Serves a built site the way GitHub Pages does: plain files under
 * /deutsch-tree/, and a 404 for every path that is not a file. There is no
 * fallback to index.html, so a link that would break on GitHub Pages breaks
 * here too.
 *
 * Given a packs folder, it also serves the same site under /local/, with
 * that folder as its `private` folder beside index.html: the app as a start
 * file serves it on a learner's computer that has packs.
 *
 *   node tests/browser/serve-site.ts <folder> <port> [<packs folder>]
 */
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

const [folder, port, packsFolder] = process.argv.slice(2)
if (!folder || !port) throw new Error('usage: serve-site.ts <folder> <port> [<packs folder>]')

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
}

const site = path.resolve(folder)
const packs = packsFolder ? path.resolve(packsFolder) : null

/** The file a path stands for, or null when it is outside what is served. */
function fileFor(pathname: string): string | null {
  const inside = (root: string, relative: string) => {
    const file = path.resolve(root, relative)
    return file.startsWith(root + path.sep) ? file : null
  }
  const under = (prefix: string) =>
    pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length)) || 'index.html' : null

  const published = under('/deutsch-tree/')
  if (published !== null) return inside(site, published)
  const local = packs ? under('/local/') : null
  if (local === null || !packs) return null
  if (local.startsWith('private/')) return inside(packs, local.slice('private/'.length))
  return inside(site, local)
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  const file = fileFor(pathname)
  if (file === null) {
    response.writeHead(404).end('Not found')
    return
  }
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(Number(port), '127.0.0.1')

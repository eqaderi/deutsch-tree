/**
 * Serves a built site the way GitHub Pages does: plain files under
 * /deutsch-tree/, and a 404 for every path that is not a file. There is no
 * fallback to index.html, so a link that would break on GitHub Pages breaks
 * here too.
 *
 *   node tests/browser/serve-site.ts <folder> <port>
 */
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

const [folder, port] = process.argv.slice(2)
if (!folder || !port) throw new Error('usage: serve-site.ts <folder> <port>')

const PREFIX = '/deutsch-tree/'
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
}

const root = path.resolve(folder)

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  const relative = pathname.startsWith(PREFIX)
    ? decodeURIComponent(pathname.slice(PREFIX.length)) || 'index.html'
    : null
  const file = relative === null ? null : path.resolve(root, relative)

  if (file === null || !file.startsWith(root + path.sep)) {
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

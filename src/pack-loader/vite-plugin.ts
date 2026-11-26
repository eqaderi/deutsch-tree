/**
 * Ships PDF.js's own files with the site, so the private exam view can show
 * any book's pages without asking another server for a font or a decoder.
 * They are fetched only when a PDF needs them. The build copies them into
 * `pdfjs/`; the dev server serves them from pdfjs-dist.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Plugin } from 'vite'
import { PDFJS_RESOURCE_FOLDERS, PDFJS_RESOURCES } from './pdfjs-resources.ts'

const TYPES: Record<string, string> = { '.wasm': 'application/wasm', '.js': 'text/javascript' }

export function pdfjsResources(): Plugin {
  const pdfjs = path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))
  const files = () =>
    PDFJS_RESOURCE_FOLDERS.flatMap((folder) => readdirSync(path.join(pdfjs, folder)).map((name) => `${folder}/${name}`))

  return {
    name: 'deutsch-tree:pdfjs-resources',

    configureServer(server) {
      const known = new Set(files())
      server.middlewares.use((request, response, next) => {
        const { pathname } = new URL(request.url ?? '/', 'http://localhost')
        const file = pathname.startsWith(`/${PDFJS_RESOURCES}/`) ? pathname.slice(PDFJS_RESOURCES.length + 2) : null
        if (file === null || !known.has(file)) return next()
        response.setHeader('content-type', TYPES[path.extname(file)] ?? 'application/octet-stream')
        response.end(readFileSync(path.join(pdfjs, file)))
      })
    },

    generateBundle() {
      for (const file of files()) {
        this.emitFile({
          type: 'asset',
          fileName: `${PDFJS_RESOURCES}/${file}`,
          source: readFileSync(path.join(pdfjs, file)),
        })
      }
    },
  }
}

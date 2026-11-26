/**
 * Runs the content pipeline as part of the site build and the dev server, so
 * the app always loads compiled content from `content/` next to index.html.
 *
 * Build: content errors fail the build; the bundle is emitted into the site.
 * Dev: the bundle is served from memory and recompiled when a content file changes.
 */
import path from 'node:path'
import type { Plugin } from 'vite'
import { bundleFiles, compileContent, formatReport } from './index.ts'

/** Where the compiled bundle lives inside the site. */
const SITE_FOLDER = 'content'

export function contentPipeline(contentDir: string): Plugin {
  const compile = async (): Promise<Map<string, string>> => {
    const { report, bundle } = await compileContent(contentDir)
    if (!bundle) throw new Error(`\n${formatReport(report)}`)
    return new Map(bundleFiles(bundle).map((file) => [`${SITE_FOLDER}/${file.path}`, file.json]))
  }

  return {
    name: 'deutsch-tree:content-pipeline',

    async generateBundle() {
      for (const [fileName, source] of await compile()) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },

    configureServer(server) {
      const root = path.resolve(contentDir)
      server.watcher.add(root)
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(root + path.sep)) server.ws.send({ type: 'full-reload' })
      })

      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const start = pathname.indexOf(`/${SITE_FOLDER}/`)
        if (start === -1 || !pathname.endsWith('.json')) return next()

        try {
          const files = await compile()
          const json = files.get(decodeURIComponent(pathname.slice(start + 1)))
          if (json === undefined) {
            response.writeHead(404).end('Not found')
            return
          }
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }).end(json)
        } catch (error) {
          server.config.logger.error((error as Error).message)
          response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end((error as Error).message)
        }
      })
    },
  }
}

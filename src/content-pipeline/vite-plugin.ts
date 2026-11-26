/**
 * Runs the content pipeline as part of the site build and the dev server, so
 * the app always loads compiled content from `content/` next to index.html.
 *
 * Build: content errors fail the build; the bundle is emitted into the site,
 * with the audio files that its published nodes say (and no other).
 * Dev: the bundle is served from memory and recompiled when a content file
 * changes; audio is served from the content folder.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'
import { spokenItems } from '../audio/index.ts'
import { AUDIO_FOLDER, audioFile } from '../content-model/audio.ts'
import { bundleFiles, compileContent, formatReport } from './index.ts'

/** Where the compiled bundle lives inside the site. */
const SITE_FOLDER = 'content'

export function contentPipeline(contentDir: string): Plugin {
  const compileBundle = async () => {
    const { report, bundle } = await compileContent(contentDir)
    if (!bundle) throw new Error(`\n${formatReport(report)}`)
    return bundle
  }
  const compile = async (): Promise<Map<string, string>> =>
    new Map(bundleFiles(await compileBundle()).map((file) => [`${SITE_FOLDER}/${file.path}`, file.json]))

  return {
    name: 'deutsch-tree:content-pipeline',

    async generateBundle() {
      const bundle = await compileBundle()
      for (const file of bundleFiles(bundle)) {
        this.emitFile({ type: 'asset', fileName: `${SITE_FOLDER}/${file.path}`, source: file.json })
      }
      // The content check has made sure that each of these files exists.
      for (const key of new Set(spokenItems(bundle.nodes).map((item) => item.key))) {
        const file = audioFile(key)
        this.emitFile({
          type: 'asset',
          fileName: `${SITE_FOLDER}/${file}`,
          source: await readFile(path.join(contentDir, file)),
        })
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
        const audio = pathname.match(new RegExp(`/${SITE_FOLDER}/${AUDIO_FOLDER}/([0-9a-f]+)\\.mp3$`))
        if (audio) {
          const sound = await readFile(path.join(contentDir, audioFile(audio[1] ?? ''))).catch(() => null)
          if (!sound) return response.writeHead(404).end('Not found')
          response.writeHead(200, { 'content-type': 'audio/mpeg' }).end(sound)
          return
        }
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

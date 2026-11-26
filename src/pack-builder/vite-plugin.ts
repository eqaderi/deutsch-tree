/**
 * Keeps private packs out of the built site. A pack is a learner's own copy
 * of a book and must never be published, so the build fails if anything from
 * the project's `private` folder is about to end up in it:
 *
 *   - code that imports or links a file from the folder,
 *   - a static-files folder that is, holds, or lies inside the folder, or
 *     holds a link into it,
 *   - a `private` folder in the output, at any depth.
 *
 * The dev server is not affected. The site on GitHub Pages is built from the
 * repository, which never holds the folder (.gitignore); this guard covers a
 * site built on a computer that has packs.
 */
import { existsSync, readdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { PACK_LIST_FILE, PACKS_FOLDER } from '../content-model/pack.ts'
import { listPacks } from './pack-list.ts'

const REASON = 'Private packs are never published.'

export function keepPacksOutOfTheSite(): Plugin {
  let root = process.cwd()
  let packsDir = path.resolve(root, PACKS_FOLDER)
  let outDir = path.resolve(root, 'dist')

  /** The path with links followed, so two spellings of one place compare equal. */
  const real = (file: string) => {
    try {
      return realpathSync(file)
    } catch {
      return file
    }
  }
  const isInside = (folder: string, file: string) => {
    const [outer, inner] = [real(folder), real(file)]
    return inner === outer || inner.startsWith(outer + path.sep)
  }
  /** The first link in a folder, at any depth, that leads to the private folder or into it. */
  const linkIntoPacks = (folder: string): string | undefined => {
    const entries = existsSync(folder) ? readdirSync(folder, { recursive: true, withFileTypes: true }) : []
    return entries
      .filter((entry) => entry.isSymbolicLink())
      .map((entry) => path.join(entry.parentPath, entry.name))
      .find((link) => isInside(packsDir, link) || isInside(link, packsDir))
  }
  /** The file a module id or asset name stands for, without `?query` and virtual-module marks. */
  const fileOf = (id: string) => path.resolve(root, id.replace(/^\0+/, '').replace(/[?#].*$/, ''))

  return {
    name: 'deutsch-tree:keep-packs-out-of-the-site',
    apply: 'build',
    enforce: 'pre',

    config(config) {
      // A small file linked from code is normally written into the script
      // itself, where generateBundle cannot see where it came from. Keeping
      // pack files out of that makes them show up there as files.
      const limit = config.build?.assetsInlineLimit
      return {
        build: {
          assetsInlineLimit: (file: string, content: Buffer) => {
            if (isInside(packsDir, fileOf(file))) return false
            if (typeof limit === 'function') return limit(file, content)
            // No answer leaves the decision to Vite's own default.
            return limit === undefined ? undefined : content.length < limit
          },
        },
      }
    },

    configResolved(config) {
      root = config.root
      packsDir = path.resolve(config.root, PACKS_FOLDER)
      outDir = path.resolve(config.root, config.build.outDir)
      const publicDir = config.publicDir ? path.resolve(config.root, config.publicDir) : null
      if (publicDir && (isInside(packsDir, publicDir) || isInside(publicDir, packsDir))) {
        throw new Error(
          `The static-files folder ${publicDir} would copy ${packsDir} into the site. ${REASON} Use a folder that does not hold the private folder.`,
        )
      }
      // A link inside the static-files folder is copied as what it points at.
      const linked = publicDir && linkIntoPacks(publicDir)
      if (linked) {
        throw new Error(`${linked} in the static-files folder leads into ${packsDir}. ${REASON} Remove the link.`)
      }
      if (isInside(packsDir, outDir)) {
        throw new Error(`The site cannot be built into ${outDir}: that is the private folder. ${REASON}`)
      }
    },

    load(id) {
      if (isInside(packsDir, fileOf(id))) {
        this.error(`${fileOf(id)} is in the private folder and cannot be part of the site. ${REASON}`)
      }
      return null
    },

    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        const sources = file.type === 'asset' ? file.originalFileNames : Object.keys(file.modules)
        const fromPack = sources.map(fileOf).find((source) => isInside(packsDir, source))
        // An asset made from a source in memory has no original file, so its name is all there is to go by.
        if (fromPack || file.fileName.split('/').includes(PACKS_FOLDER)) {
          this.error(`${file.fileName} would put ${fromPack ?? 'a private folder'} into the site. ${REASON}`)
        }
      }
    },

    closeBundle() {
      const entries = existsSync(outDir) ? readdirSync(outDir, { recursive: true, withFileTypes: true }) : []
      const folder = entries.find((entry) => entry.isDirectory() && entry.name === PACKS_FOLDER)
      if (folder) {
        const found = path.join(folder.parentPath, folder.name)
        throw new Error(`${found} exists: the built site holds a private folder. ${REASON}`)
      }
    },
  }
}

/**
 * Lets `pnpm dev` find the packs with nothing to set up: it answers
 * private/packs.json from the folder as it is now, so a pack built or copied
 * in appears on the next reload. The packs' own files are served from the
 * folder like every other file of the project. Not part of a build.
 */
export function packsOnTheDevServer(): Plugin {
  return {
    name: 'deutsch-tree:packs-on-the-dev-server',
    apply: 'serve',
    configureServer(server) {
      const listUrl = `/${PACKS_FOLDER}/${PACK_LIST_FILE}`
      server.middlewares.use(async (request, response, next) => {
        const { pathname } = new URL(request.url ?? '/', 'http://localhost')
        if (pathname !== listUrl) return next()
        try {
          const list = await listPacks(path.resolve(server.config.root, PACKS_FOLDER))
          response.setHeader('content-type', 'application/json; charset=utf-8')
          response.setHeader('cache-control', 'no-store')
          response.end(JSON.stringify(list))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

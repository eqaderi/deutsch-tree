/**
 * Keeps private packs out of the built site. A pack is a learner's own copy
 * of a book and must never be published, so the build fails if anything from
 * the project's `private` folder is about to end up in it:
 *
 *   - code that imports or links a file from the folder,
 *   - a static-files folder that is, holds, or lies inside the folder,
 *   - a `private` folder in the output.
 *
 * The dev server is not affected. The site on GitHub Pages is built from the
 * repository, which never holds the folder (.gitignore); this guard covers a
 * site built on a computer that has packs.
 */
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { PACKS_FOLDER } from '../content-model/pack.ts'

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
        if (fromPack || file.fileName.split('/')[0] === PACKS_FOLDER) {
          this.error(`${file.fileName} would put ${fromPack ?? 'a private folder'} into the site. ${REASON}`)
        }
      }
    },

    closeBundle() {
      if (existsSync(path.join(outDir, PACKS_FOLDER))) {
        throw new Error(`${path.join(outDir, PACKS_FOLDER)} exists: the built site holds a private folder. ${REASON}`)
      }
    },
  }
}

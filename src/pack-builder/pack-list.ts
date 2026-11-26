/**
 * The list of packs in a packs folder (private/packs.json). A browser cannot
 * list a folder, so the app reads this file to find the packs. The builder
 * writes it after every build and the dev server answers it from the folder
 * as it is, so a learner never writes it by hand.
 */
import { readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PACK_DESCRIPTION_FILE, PACK_FORMAT, PACK_ID, PACK_LIST_FILE, type PackList } from '../content-model/pack.ts'

/** The packs in a folder: every subfolder with a pack id for a name and a pack.json in it, in name order. */
export async function listPacks(packsDir: string): Promise<PackList> {
  const entries = await readdir(packsDir, { withFileTypes: true }).catch(() => [])
  const packs: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !PACK_ID.test(entry.name)) continue
    const description = await stat(path.join(packsDir, entry.name, PACK_DESCRIPTION_FILE)).catch(() => null)
    if (description?.isFile()) packs.push(entry.name)
  }
  return { format: PACK_FORMAT, packs: packs.sort() }
}

/** Writes the folder's packs.json from what the folder holds now. */
export async function writePackList(packsDir: string): Promise<PackList> {
  const list = await listPacks(packsDir)
  await writeFile(path.join(packsDir, PACK_LIST_FILE), `${JSON.stringify(list, null, 2)}\n`)
  return list
}

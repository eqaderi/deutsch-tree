/**
 * Start files: the folder that runs the app on a learner's own computer, with
 * the private packs, and that can be copied whole to another computer.
 *
 *   <out>/Start on Mac.command     runs server/serve.pl with the Perl of macOS
 *   <out>/Start on Windows.bat     runs server/serve.ps1 with Windows PowerShell
 *   <out>/instructions-en.html, instructions-fa.html
 *   <out>/server/                  the two servers
 *   <out>/app/                     the built site (dist/), with private/ beside index.html
 *
 * The templates are in `folder/`. Each server, when it starts, rewrites
 * app/private/packs.json from the folder as it is and writes the address a phone
 * opens into app/private/address.json, so a pack copied in by hand is found.
 * The public site is not touched: this copies dist/ after the build.
 */
import { chmod, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PACKS_FOLDER } from '../content-model/pack.ts'
import { listPacks, writePackList } from '../pack-builder/pack-list.ts'

const TEMPLATES = fileURLToPath(new URL('./folder/', import.meta.url))
export const APP_FOLDER = 'app'
const MAC_START_FILE = 'Start on Mac.command'
/** Files of the templates that Windows reads: written with Windows line ends. */
const WINDOWS_FILES = /\.(bat|ps1)$/

export interface ShareFolderOptions {
  /** The built site: what `pnpm build` writes to dist/. */
  siteDir: string
  /** The packs to put into the folder: what `pnpm pack:build` writes to private/. */
  packsDir: string
  /** The folder to write. Made anew, except for the packs already in it. */
  outDir: string
}

const exists = (file: string) =>
  stat(file).then(
    () => true,
    () => false,
  )

/** Writes the folder and gives back the packs it holds. */
export async function buildShareFolder({
  siteDir,
  packsDir,
  outDir,
}: ShareFolderOptions): Promise<{ packs: string[] }> {
  if (!(await exists(path.join(siteDir, 'index.html')))) {
    throw new Error(`${siteDir} holds no built site. Run pnpm build first.`)
  }
  await clearPreviousFolder(outDir)

  const appDir = path.join(outDir, APP_FOLDER)
  const privateDir = path.join(appDir, PACKS_FOLDER)
  await cp(siteDir, appDir, { recursive: true, filter: (source) => path.basename(source) !== PACKS_FOLDER })
  await mkdir(privateDir, { recursive: true })
  for (const id of (await listPacks(packsDir)).packs) {
    await rm(path.join(privateDir, id), { recursive: true, force: true })
    await cp(path.join(packsDir, id), path.join(privateDir, id), { recursive: true })
  }
  const list = await writePackList(privateDir)

  for (const file of await templateFiles()) {
    const target = path.join(outDir, file)
    await mkdir(path.dirname(target), { recursive: true })
    const text = await readFile(path.join(TEMPLATES, file), 'utf8')
    await writeFile(target, WINDOWS_FILES.test(file) ? text.replace(/\r?\n/g, '\r\n') : text)
  }
  await chmod(path.join(outDir, MAC_START_FILE), 0o755)
  return { packs: list.packs }
}

/**
 * Empties a folder made before by this command, except the packs in it; a
 * learner may have copied one in by hand. Refuses any other folder that is not empty.
 */
async function clearPreviousFolder(outDir: string) {
  const entries = await readdir(outDir).catch(() => [])
  if (entries.length === 0) return
  if (!(await exists(path.join(outDir, MAC_START_FILE)))) {
    throw new Error(`${outDir} is not a folder made by pnpm share. Choose another folder with --out.`)
  }
  for (const entry of entries) {
    if (entry !== APP_FOLDER) await rm(path.join(outDir, entry), { recursive: true, force: true })
  }
  const appDir = path.join(outDir, APP_FOLDER)
  for (const entry of await readdir(appDir).catch(() => [])) {
    if (entry !== PACKS_FOLDER) await rm(path.join(appDir, entry), { recursive: true, force: true })
  }
}

async function templateFiles(dir = TEMPLATES, prefix = ''): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...(await templateFiles(path.join(dir, entry.name), file)))
    else if (!entry.name.startsWith('.')) files.push(file)
  }
  return files
}

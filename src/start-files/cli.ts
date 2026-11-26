/**
 * Writes the folder that runs the app on a learner's computer: the built site,
 * the private packs and the start files. `pnpm share` builds the site first.
 *
 *   node src/start-files/cli.ts [--out <folder>] [--packs <folder>] [--site <folder>]
 *
 * README.md, "Running the app at home", explains the folder.
 */
import path from 'node:path'
import { parseArgs } from 'node:util'
import { PACKS_FOLDER } from '../content-model/pack.ts'
import { buildShareFolder } from './index.ts'

const USAGE = `Writes the folder that runs deutsch-tree at home, with your packs and the start files.

  pnpm share [--out <folder>] [--packs <folder>]

  --out <folder>     the folder to write; default: share
  --packs <folder>   where your packs are; default: ${PACKS_FOLDER}
  --site <folder>    the built site; default: dist (pnpm share builds it first)`

function usage(problem: string): never {
  console.error(`${problem}\n\n${USAGE}`)
  process.exit(2)
}

const { values } = (() => {
  try {
    return parseArgs({
      options: {
        out: { type: 'string', default: 'share' },
        packs: { type: 'string', default: PACKS_FOLDER },
        site: { type: 'string', default: 'dist' },
        help: { type: 'boolean', default: false },
      },
    })
  } catch (error) {
    return usage((error as Error).message)
  }
})()

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}

try {
  const { packs } = await buildShareFolder({ siteDir: values.site, packsDir: values.packs, outDir: values.out })
  const out = path.resolve(values.out)
  console.log(`Wrote ${out}`)
  console.log(packs.length === 0 ? 'It holds no pack.' : `Packs: ${packs.join(', ')}`)
  console.log('Start it with "Start on Mac.command" or "Start on Windows.bat" in that folder.')
  console.log('Copy the whole folder, as a zip, to give it to someone in your household.')
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}

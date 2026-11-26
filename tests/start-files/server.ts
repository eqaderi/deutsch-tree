/**
 * Runs a start file's server, the way the start file runs it, on a folder
 * and a free port. The Mac start file runs `server/serve.pl` with the Perl
 * that ships with macOS; the Windows start file runs `server/serve.ps1` with
 * Windows PowerShell. Tests run the same scripts with the `perl` and `pwsh`
 * found here (PowerShell 7 stands in for Windows PowerShell 5.1).
 */
import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SERVER_DIR = path.resolve('src/start-files/folder/server')

export type ServerKind = 'perl' | 'powershell'

function runs(command: string, versionFlag: string): boolean {
  try {
    execFileSync(command, [versionFlag], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** The servers that can run on this computer. PowerShell is often missing on a Mac; CI has it. */
export const availableServers: ServerKind[] = [
  ...(runs('perl', '-v') ? (['perl'] as const) : []),
  ...(runs('pwsh', '-Version') ? (['powershell'] as const) : []),
]

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '0.0.0.0', () => {
      const address = server.address()
      server.close(() =>
        address && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port')),
      )
    })
  })
}

export interface RunningServer {
  url: string
  port: number
  /** Everything the server printed so far. */
  output: () => string
  stop: () => Promise<void>
}

/** Starts the server on `folder` (the app folder: index.html and private/) and waits until it answers. */
export async function startServer(kind: ServerKind, folder: string): Promise<RunningServer> {
  const port = await freePort()
  return kind === 'perl'
    ? run('perl', [path.join(SERVER_DIR, 'serve.pl'), folder, String(port)], port)
    : run(
        'pwsh',
        ['-NoProfile', '-File', path.join(SERVER_DIR, 'serve.ps1'), '-Root', folder, '-Port', String(port)],
        port,
      )
}

/**
 * Double-clicks the Mac start file of a folder written by `pnpm share`, as
 * far as a test can: Finder starts it from the home folder, with a bare PATH.
 */
export async function startMacStartFile(folder: string): Promise<RunningServer> {
  const port = await freePort()
  return run('/bin/sh', [path.join(folder, 'Start on Mac.command'), String(port)], port, {
    cwd: tmpdir(),
    env: { PATH: '/usr/bin:/bin', NO_OPEN: '1' },
  })
}

const answers = (url: string) =>
  fetch(url).then(
    () => true,
    () => false,
  )

async function run(
  command: string,
  args: string[],
  port: number,
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<RunningServer> {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? { ...process.env, NO_OPEN: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const collect = (chunk: Buffer) => {
    output += chunk
  }
  child.stdout.on('data', collect)
  child.stderr.on('data', collect)
  const stop = () =>
    new Promise<void>((resolve) => {
      if (child.exitCode !== null) return resolve()
      child.once('exit', () => resolve())
      child.kill()
    })

  const url = `http://127.0.0.1:${port}/`
  const deadline = Date.now() + 20_000
  while (!(await answers(url))) {
    if (child.exitCode !== null) throw new Error(`${command} stopped:\n${output}`)
    if (Date.now() > deadline) {
      await stop()
      throw new Error(`${command} did not answer:\n${output}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return { url, port, output: () => output, stop }
}

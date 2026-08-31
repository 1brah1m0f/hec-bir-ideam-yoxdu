import { spawn } from 'node:child_process'

/**
 * Runs the API and the Vite dev server together. Vite proxies /api to :8787
 * (see vite.config.ts), so the page behaves exactly as it will in production.
 * Kept as a script rather than a dependency — `concurrently` is a lot of
 * node_modules for two child processes.
 */

const procs = [
  { name: 'api  ', cmd: 'node', args: ['--env-file-if-exists=.env', 'server/index.js'], colour: '\x1b[33m' },
  { name: 'web  ', cmd: 'npx', args: ['vite'], colour: '\x1b[36m' },
]

const RESET = '\x1b[0m'
let shuttingDown = false

const children = procs.map(({ name, cmd, args, colour }) => {
  const child = spawn(cmd, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  const prefix = (chunk, stream) => {
    for (const line of String(chunk).split('\n')) {
      if (line.trim()) stream.write(`${colour}${name}${RESET} ${line}\n`)
    }
  }
  child.stdout.on('data', (c) => prefix(c, process.stdout))
  child.stderr.on('data', (c) => prefix(c, process.stderr))

  child.on('exit', (code) => {
    if (shuttingDown) return
    console.log(`${colour}${name}${RESET} dayandı (${code}) — hər ikisi bağlanır`)
    stop()
  })

  return child
})

function stop() {
  if (shuttingDown) return
  shuttingDown = true
  for (const c of children) c.kill()
  setTimeout(() => process.exit(0), 200)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

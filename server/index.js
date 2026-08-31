import { app, PRODUCTION } from './app.js'
import { closeDb, describeDb } from './db.js'

/**
 * Runs the app as a long-lived process: local development, a Docker container,
 * a VPS under systemd. Vercel uses api/index.js instead and never reaches here.
 */

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '0.0.0.0'

const server = app.listen(PORT, HOST, async () => {
  console.log(`Öz çayın · ${PRODUCTION ? 'produksiya' : 'inkişaf'} · port ${PORT}`)
  console.log(`  sayt   http://localhost:${PORT}`)
  console.log(`  admin  http://localhost:${PORT}/admin`)
  try {
    console.log(`  baza   ${await describeDb()}`)
  } catch (err) {
    console.error('  baza   AÇILMADI —', err.message)
  }
  if (!PRODUCTION && (process.env.ADMIN_PASS ?? 'admin') === 'admin') {
    console.warn('  qeyd: admin parolu «admin»dir — produksiyada server belə başlamayacaq.')
  }
})

/**
 * SIGTERM is how every container platform asks a process to stop. SQLite wants
 * its handle closed so it can checkpoint the WAL; without that the next start
 * has to recover the journal instead.
 */
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} — bağlanır…`)
    server.close(async () => {
      await closeDb()
      process.exit(0)
    })
    // a hung keep-alive connection must not hold the deploy open forever
    setTimeout(() => process.exit(1), 8000).unref()
  })
}

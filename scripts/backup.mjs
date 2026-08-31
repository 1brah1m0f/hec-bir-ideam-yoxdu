import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

/**
 * Snapshots orders.db. `VACUUM INTO` copies a consistent view even while the
 * server is writing, which plain file copying cannot promise with WAL — the
 * -wal file holds committed pages the .db file has not received yet.
 *
 *   npm run backup
 *   DATA_DIR=/data BACKUP_DIR=/data/backups npm run backup
 */

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR ?? join(here, '..', 'server', 'data')
const outDir = process.env.BACKUP_DIR ?? join(dataDir, 'backups')
const keep = Math.max(1, Number(process.env.BACKUP_KEEP ?? 14))

const source = join(dataDir, 'orders.db')
if (!existsSync(source)) {
  console.error(`Baza tapılmadı: ${source}`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const target = join(outDir, `orders-${stamp}.db`)

const db = new DatabaseSync(source)
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
db.close()

const size = (statSync(target).size / 1024).toFixed(1)
console.log(`Nüsxə: ${target} (${size} KB)`)

// keep the newest `keep` snapshots and drop the rest
const old = readdirSync(outDir)
  .filter((f) => /^orders-.*\.db$/.test(f))
  .sort()
  .reverse()
  .slice(keep)
for (const f of old) {
  unlinkSync(join(outDir, f))
  console.log(`Silindi: ${f}`)
}

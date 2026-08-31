export { app as default } from '../server/app.js'

/**
 * Vercel entry point. An Express app is already a (req, res) handler, so the
 * whole API and the admin panel run as one serverless function; vercel.json
 * routes /api/* and /admin here.
 *
 * The database has to be Turso in this shape — a serverless filesystem is
 * throwaway, so set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. See DEPLOY.md.
 */

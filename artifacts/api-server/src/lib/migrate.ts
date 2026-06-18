import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '@workspace/db';
import { logger } from './logger.js';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../lib/db/migrations',
);

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Tracking table — idempotent, safe to run every startup
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    const { rows } = await client.query<{ name: string }>(
      'SELECT name FROM _migrations ORDER BY name',
    );
    const applied = new Set(rows.map(r => r.name));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      logger.info(`Applying migration: ${file}`);
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`Migration done: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed (${file}): ${err}`);
      }
    }
  } finally {
    client.release();
  }
}

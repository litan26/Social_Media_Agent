import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_NAME = 'AI_Socialmedia';

function getBaseUrl(): string {
  const url = process.env.DATABASE_URL || `mysql://root@localhost:3306/${DB_NAME}`;
  return url.replace(/\/[^/?]+(\?.*)?$/, '/');
}

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || `mysql://root@localhost:3306/${DB_NAME}`;
}

async function runMigrationFile(pool: mysql.Connection, filePath: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.replace(/--.*$/gm, '').trim())
    .filter((s) => s.length > 0);

  const fileName = path.basename(filePath);
  console.log(`\n--- ${fileName} (${statements.length} statements) ---`);

  for (const statement of statements) {
    const preview = statement.replace(/\s+/g, ' ').slice(0, 70);
    try {
      await pool.query(statement);
      console.log(`✓ ${preview}...`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === 'ER_TABLE_EXISTS_ERROR' ||
        code === 'ER_DUP_KEYNAME' ||
        code === 'ER_DUP_FIELDNAME'
      ) {
        console.log(`○ Already exists: ${preview}...`);
        continue;
      }
      console.error(`✗ Failed: ${preview}...`);
      throw err;
    }
  }
}

async function migrate(): Promise<void> {
  const baseUrl = getBaseUrl();
  const dbUrl = getDatabaseUrl();

  console.log('Creating database if needed...');
  const admin = await mysql.createConnection(baseUrl);
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await admin.end();

  const pool = await mysql.createConnection(dbUrl);
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    await runMigrationFile(pool, path.join(migrationsDir, file));
  }

  const [tables] = await pool.query('SHOW TABLES');
  await pool.end();

  console.log(`\nDone. Tables in ${DB_NAME}:`);
  for (const row of tables as Record<string, string>[]) {
    console.log(`  - ${Object.values(row)[0]}`);
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});

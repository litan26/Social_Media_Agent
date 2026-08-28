import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  return url;
}

/** Postgres errors that mean "this migration step was already applied". */
const ALREADY_APPLIED = new Set([
  '42P07', // duplicate_table
  '42701', // duplicate_column
  '42710', // duplicate_object (constraint/index)
  '42P16', // invalid_table_definition
  '42704', // undefined_object (DROP CONSTRAINT of a missing constraint)
]);

/**
 * Split on semicolons that terminate a statement, ignoring those inside string
 * literals or $$-quoted bodies (plpgsql functions contain their own semicolons).
 */
function splitStatements(sql: string): string[] {
  const stripped = sql.replace(/--.*$/gm, '');
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let dollarTag: string | null = null;

  for (let i = 0; i < stripped.length; i++) {
    const rest = stripped.slice(i);

    if (!inSingle) {
      const tagMatch = /^\$([A-Za-z_]*)\$/.exec(rest);
      if (tagMatch) {
        const tag = tagMatch[0];
        if (dollarTag === null) dollarTag = tag;
        else if (dollarTag === tag) dollarTag = null;
        current += tag;
        i += tag.length - 1;
        continue;
      }
    }

    const ch = stripped[i];
    if (ch === "'" && dollarTag === null) inSingle = !inSingle;

    if (ch === ';' && !inSingle && dollarTag === null) {
      statements.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  statements.push(current);

  return statements.map((s) => s.trim()).filter((s) => s.length > 0);
}

async function runMigrationFile(client: pg.Client, filePath: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = splitStatements(sql);

  const fileName = path.basename(filePath);
  console.log(`\n--- ${fileName} (${statements.length} statements) ---`);

  for (const statement of statements) {
    const preview = statement.replace(/\s+/g, ' ').slice(0, 70);
    try {
      await client.query(statement);
      console.log(`✓ ${preview}...`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code && ALREADY_APPLIED.has(code)) {
        console.log(`○ Already exists: ${preview}...`);
        continue;
      }
      console.error(`✗ Failed: ${preview}...`);
      throw err;
    }
  }
}

async function migrate(): Promise<void> {
  const dbUrl = getDatabaseUrl();

  const needsSsl =
    /[?&]sslmode=require/.test(dbUrl || '') || process.env.PGSSL === 'true';

  const client = new pg.Client({
    connectionString: dbUrl,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    await runMigrationFile(client, path.join(migrationsDir, file));
  }

  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  await client.end();

  console.log('\nDone. Tables:');
  for (const row of tables.rows as { tablename: string }[]) {
    console.log(`  - ${row.tablename}`);
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});

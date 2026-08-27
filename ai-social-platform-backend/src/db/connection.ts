import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export type Row = Record<string, any>;

export interface QueryResult<T = Row> {
  rows: T[];
  insertId?: number;
  rowCount?: number;
}

/** Return numerics (int8/numeric) as JS numbers rather than strings. */
pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // int8
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // numeric

const connectionString = process.env.DATABASE_URL;
const needsSsl = /[?&]sslmode=require/.test(connectionString || '') ||
  process.env.PGSSL === 'true';

const pgPool = new pg.Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

/**
 * Rewrite legacy `?` placeholders to Postgres `$n`. Queries already using `$n`
 * are passed through untouched. `?` inside string literals is preserved.
 */
function toPgPlaceholders(sql: string): string {
  if (!sql.includes('?')) return sql;

  let index = 0;
  let inSingle = false;
  let out = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      // Handle escaped '' inside a literal
      if (inSingle && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (ch === '?' && !inSingle) {
      out += `$${++index}`;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * INSERTs need RETURNING id for the insertId contract used across the codebase.
 * Skipped when the caller already supplied RETURNING or ON CONFLICT ... DO NOTHING.
 */
function withReturningId(sql: string): { sql: string; wantsId: boolean } {
  const trimmed = sql.trim();
  if (!/^insert\s+into/i.test(trimmed)) return { sql, wantsId: false };
  if (/\breturning\b/i.test(trimmed)) return { sql, wantsId: false };

  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, '');
  return { sql: `${withoutTrailingSemicolon} RETURNING id`, wantsId: true };
}

export async function query<T = Row>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const converted = toPgPlaceholders(text);
  const { sql, wantsId } = withReturningId(converted);

  try {
    const result = await pgPool.query(sql, params as unknown[]);

    if (wantsId) {
      const id = (result.rows[0] as Row | undefined)?.id;
      return {
        rows: [],
        insertId: id === undefined ? undefined : Number(id),
        rowCount: result.rowCount ?? 0,
      };
    }

    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (err) {
    // Tables without an `id` column (e.g. user_preferences, oauth_states)
    // reject RETURNING id — retry without it.
    if (wantsId && (err as { code?: string }).code === '42703') {
      const result = await pgPool.query(converted, params as unknown[]);
      return { rows: [], rowCount: result.rowCount ?? 0 };
    }
    throw err;
  }
}

/** Session context; row isolation enforced via user_id in application queries */
export async function setCurrentUser(userId: number): Promise<void> {
  await query('SELECT set_config($1, $2, false)', ['app.current_user_id', String(userId)]);
}

export const pool = { query };

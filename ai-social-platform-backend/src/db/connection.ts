import mysql from 'mysql2/promise';
import type { ExecuteValues, ResultSetHeader, RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

export interface QueryResult<T = RowDataPacket> {
  rows: T[];
  insertId?: number;
}

const mysqlPool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '20', 10),
});

function toMysqlPlaceholders(sql: string): string {
  return sql.replace(/\$(\d+)/g, '?');
}

export async function query<T = RowDataPacket>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const sql = toMysqlPlaceholders(text);
  const [result] = await mysqlPool.execute(sql, params as ExecuteValues);

  if (Array.isArray(result)) {
    return { rows: result as T[] };
  }

  const header = result as ResultSetHeader;
  return { rows: [], insertId: header.insertId };
}

/** Session context; row isolation enforced via user_id in application queries */
export async function setCurrentUser(userId: number): Promise<void> {
  await query('SET @app_current_user_id = $1', [userId]);
}

export const pool = { query };

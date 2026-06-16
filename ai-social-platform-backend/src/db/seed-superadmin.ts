import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from './connection.js';

dotenv.config();

async function seedSuperadmin(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const user = existing.rows[0] as { id: number; role: string };
    await pool.query(
      'UPDATE users SET role = $1, password_hash = $2, plan = NULL, updated_at = NOW() WHERE id = $3',
      ['superadmin', passwordHash, user.id]
    );
    console.log(
      user.role === 'superadmin'
        ? `Superadmin password synced from .env: ${email}`
        : `Updated existing user to superadmin: ${email}`
    );
    return;
  }

  const insertResult = await pool.query(
    'INSERT INTO users (email, password_hash, role, plan) VALUES ($1, $2, $3, NULL)',
    [email, passwordHash, 'superadmin']
  );
  const userId = insertResult.insertId!;
  await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId]);

  console.log(`Superadmin created: ${email}`);
}

seedSuperadmin().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});

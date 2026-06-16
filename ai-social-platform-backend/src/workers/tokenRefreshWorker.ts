import cron from 'node-cron';
import axios from 'axios';
import { pool } from '../db/connection.js';
import { encrypt, decrypt } from '../utils/encryption.js';

async function refreshTwitterToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const response = await axios.post(
    'https://api.twitter.com/2/oauth2/token',
    new URLSearchParams({
      client_id: process.env.TWITTER_CLIENT_ID || '',
      client_secret: process.env.TWITTER_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return {
    accessToken: response.data.access_token,
    expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
  };
}

/** Hourly — refresh tokens expiring within 48 hours, scoped by user_id. */
cron.schedule('0 * * * *', async () => {
  console.log('Running token refresh job...');

  try {
    const result = await pool.query(
      `SELECT id, user_id, platform, refresh_token
       FROM social_accounts
       WHERE user_id IS NOT NULL
         AND expires_at < DATE_ADD(NOW(), INTERVAL 48 HOUR)
         AND refresh_token IS NOT NULL AND refresh_token != ''`
    );

    for (const account of result.rows) {
      try {
        if (account.platform !== 'twitter') continue;
        if (!process.env.TWITTER_CLIENT_ID) continue;

        const decryptedRefresh = decrypt(account.refresh_token);
        const { accessToken, expiresAt } = await refreshTwitterToken(decryptedRefresh);

        await pool.query(
          `UPDATE social_accounts
           SET access_token = $1, expires_at = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [encrypt(accessToken), expiresAt, account.id, account.user_id]
        );

        console.log(`Token refreshed for user ${account.user_id} on ${account.platform}`);
      } catch (error) {
        console.error(`Failed to refresh token for account ${account.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Token refresh job failed:', error);
  }
});

console.log('Token refresh worker scheduled (every hour)');

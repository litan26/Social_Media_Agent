import cron from 'node-cron';
import { InsightsService } from '../services/insights.service.js';

/** Weekly — Monday 09:00 */
cron.schedule('0 9 * * 1', async () => {
  console.log('Running weekly AI insights job...');
  try {
    await InsightsService.runWeeklyInsightsForAllUsers();
  } catch (err) {
    console.error('Weekly insights job failed:', err);
  }
});

console.log('Weekly AI insights worker scheduled (Mondays 09:00)');

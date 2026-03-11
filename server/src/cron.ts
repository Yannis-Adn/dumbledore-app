import cron from 'node-cron';
import { checkDeadlines, checkNewEvents } from './routes/check-deadlines.js';

export function startCronJobs() {
  // Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[CRON] Running checks at ${timestamp}`);
    try {
      const [deadlineResult, newEventResult] = await Promise.all([
        checkDeadlines(),
        checkNewEvents(),
      ]);
      const totalSent = Object.values(deadlineResult.results).reduce((sum, r) => sum + r.sent, 0);
      console.log(
        `[CRON] Done — ${totalSent} panoramix + ${deadlineResult.gandalfSent} gandalf + ${newEventResult.newEvents} new event notifications sent`,
      );
    } catch (e) {
      console.error('[CRON] Error:', e);
    }
  });

  console.log('[CRON] Scheduled checks every 5 minutes');
}

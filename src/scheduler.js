import cron from 'node-cron';
import { config } from './config.js';
import { getDateKey } from './time.js';
import { publishQuiz } from './publisher.js';

export function startScheduler(client) {
  const task = cron.schedule(
    '0 17 * * 1-5',
    async () => {
      const dateKey = getDateKey(config.timezone);
      try {
        const result = await publishQuiz(client, config.quizChannelId, dateKey);
        console.log(`[scheduler] ${dateKey}`, result.skipped ? result.reason : 'published');
      } catch (error) {
        console.error(`[scheduler] Failed for ${dateKey}`, error);
      }
    },
    {
      timezone: config.timezone,
      noOverlap: true,
      name: 'jsd13-daily-trivia',
    },
  );

  console.log(`[scheduler] Active at 17:00 Monday-Friday (${config.timezone})`);
  return task;
}

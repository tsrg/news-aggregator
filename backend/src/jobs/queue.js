import Bull from 'bull';
import { config } from '../config/index.js';
import { fetchAllSources } from './fetchRss.js';

let queue = null;

export function getQueue() {
  if (!queue && config.redis?.url) {
    queue = new Bull('rss-fetch', config.redis.url, { defaultJobOptions: { removeOnComplete: 100 } });
    queue.process(async () => {
      const n = await fetchAllSources();
      return { created: n };
    });
  }
  return queue;
}

export function startScheduler() {
  const q = getQueue();
  if (!q) return;
  q.add({}, { repeat: { cron: '*/15 * * * *' } }); // every 15 min
  console.log('RSS fetch scheduler started (every 15 min)');
}

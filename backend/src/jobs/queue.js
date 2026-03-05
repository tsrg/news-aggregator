import Bull from 'bull';
import { config } from '../config/index.js';
import { fetchAllSources } from './fetchRss.js';
import { enrichNewsItem } from '../services/articleParser.js';

let queue = null;
let articleQueue = null;

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

export function getArticleQueue() {
  if (!articleQueue && config.redis?.url) {
    articleQueue = new Bull('article-parse', config.redis.url, {
      defaultJobOptions: { removeOnComplete: 200, removeOnFail: 100 },
    });

    articleQueue.process('parse-article', async (job) => {
      const { newsItemId, url } = job.data;
      console.log(`Parsing article ${url} for news item ${newsItemId}`);
      const result = await enrichNewsItem(newsItemId, url);
      return result;
    });

    articleQueue.on('completed', (job, result) => {
      console.log(`Article parsing completed for ${job.data.url}:`, result.success ? 'success' : 'failed');
    });

    articleQueue.on('failed', (job, err) => {
      console.error(`Article parsing failed for ${job.data.url}:`, err.message);
    });
  }
  return articleQueue;
}

// Экспортируем articleQueue для использования в других модулях
export { articleQueue };

export function startScheduler() {
  const q = getQueue();
  if (!q) return;
  q.add({}, { repeat: { cron: '*/15 * * * *' } }); // every 15 min
  console.log('RSS fetch scheduler started (every 15 min)');

  // Инициализируем очередь парсинга статей
  getArticleQueue();
}

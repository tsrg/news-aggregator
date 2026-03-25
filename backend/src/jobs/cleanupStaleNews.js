import { prisma } from '../config/prisma.js';
import { getGeneralSettings } from '../services/settings.js';

const STALE_MS = 48 * 60 * 60 * 1000;

/**
 * Удаляет новости со статусами PENDING, REJECTED и MERGED, у которых createdAt старше 48 часов.
 * MERGED — поглощённые дубликаты после объединения (см. newsMerge).
 * Выполняется только если в настройках включено autoDeleteStaleUnpublishedNews.
 * @returns {{ deleted: number, skipped?: boolean }}
 */
export async function purgeStaleUnpublishedNews() {
  const { autoDeleteStaleUnpublishedNews } = await getGeneralSettings();
  if (!autoDeleteStaleUnpublishedNews) {
    return { deleted: 0, skipped: true };
  }

  const cutoff = new Date(Date.now() - STALE_MS);

  const result = await prisma.newsItem.deleteMany({
    where: {
      status: { in: ['PENDING', 'REJECTED', 'MERGED'] },
      createdAt: { lt: cutoff },
    },
  });

  if (result.count > 0) {
    console.log(`Stale unpublished news cleanup: deleted ${result.count} item(s) (older than 48h)`);
  }

  return { deleted: result.count };
}

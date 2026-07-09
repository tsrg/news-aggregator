import { prisma } from '../config/prisma.js';

/**
 * Публикует все новости со статусом SCHEDULED, у которых scheduledPublishAt <= now.
 * Перевод в PUBLISHED, проставляется publishedAt и legalReviewStatus=APPROVED.
 * Шлёт WebSocket-событие на каждую опубликованную новость.
 * @returns {{ published: number }}
 */
export async function publishDueScheduledNews() {
  const now = new Date();
  const due = await prisma.newsItem.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledPublishAt: { lte: now },
      mergedIntoId: null,
    },
    select: { id: true },
  });
  if (!due.length) return { published: 0 };

  let broadcast = null;
  try {
    ({ broadcastNewsPublished: broadcast } = await import('../ws.js'));
  } catch {}

  let published = 0;
  for (const { id } of due) {
    try {
      const item = await prisma.newsItem.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
          legalReviewStatus: 'APPROVED',
        },
        include: { section: true, source: true },
      });
      await prisma.newsItemHistory.create({
        data: {
          newsItemId: id,
          userId: null,
          snapshot: {
            title: item.title,
            summary: item.summary,
            body: item.body,
            status: item.status,
            sectionId: item.sectionId,
            scheduledPublishAt: item.scheduledPublishAt,
            autoPublished: true,
          },
        },
      });
      if (broadcast) {
        try {
          broadcast(item);
        } catch (e) {
          console.warn('WebSocket broadcast (scheduled publish):', e.message);
        }
      }
      published += 1;
    } catch (e) {
      console.error(`Failed to auto-publish scheduled news ${id}:`, e.message);
    }
  }
  if (published > 0) {
    console.log(`Scheduled publish: published ${published} item(s)`);
  }
  return { published };
}

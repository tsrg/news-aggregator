import { Server } from 'socket.io';
import { config } from './config/index.js';

let io = null;

/**
 * Attach Socket.io to the HTTP server. Must be called with the same server that Express uses.
 * @param {import('http').Server} httpServer
 */
export function attachSocketServer(httpServer) {
  const corsOrigin = config.cors.origins === null ? true : config.cors.origins;
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });
  return io;
}

function toPublicPayload(item) {
  return {
    item: {
      id: item.id,
      title: item.title,
      summary: item.summary,
      body: item.body,
      url: item.url,
      imageUrl: item.imageUrl,
      region: item.region,
      publishedAt: item.publishedAt,
      sectionId: item.sectionId,
      section: item.section
        ? { id: item.section.id, slug: item.section.slug, title: item.section.title }
        : null,
      source: item.source
        ? { name: item.source.name }
        : null,
    },
  };
}

/**
 * Broadcast that a news item was published. Payload matches public API shape (GET /api/news/:id).
 * Safe to call even if Socket.io is not attached.
 * @param {object} item - News item with include: { section: true, source: true }
 */
export function broadcastNewsPublished(item) {
  if (!io) return;
  try {
    io.emit('news:published', toPublicPayload(item));
  } catch (e) {
    console.warn('broadcastNewsPublished:', e.message);
  }
}

/**
 * Broadcast that a news item was updated (e.g. title, summary, body, section).
 * Only relevant for PUBLISHED items so the frontend can refresh visible content.
 * Safe to call even if Socket.io is not attached.
 * @param {object} item - News item with include: { section: true, source: true }
 */
export function broadcastNewsUpdated(item) {
  if (!io) return;
  try {
    io.emit('news:updated', toPublicPayload(item));
  } catch (e) {
    console.warn('broadcastNewsUpdated:', e.message);
  }
}

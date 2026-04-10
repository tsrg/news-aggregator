import { ref, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { resolveClientPublicOrigin } from './useSocketOrigin';

/**
 * Ref that increments when a news:published or news:updated event is received.
 * Index page can depend on it to refetch section preview blocks.
 */
export const refreshTrigger = ref(0);

function handleNewsEvent(payload: { item?: { id?: string; section?: { slug?: string } } }) {
  refreshNuxtData('index-top');
  refreshNuxtData('index-region');
  refreshNuxtData('index-general');
  const slug = payload?.item?.section?.slug;
  if (slug) {
    refreshNuxtData(`section-news-${slug}`);
  }
  const id = payload?.item?.id;
  if (id) {
    refreshNuxtData(`news-${id}`);
  }
  refreshTrigger.value += 1;
}

/**
 * Subscribe to real-time news publications and updates over WebSocket (client-only).
 * Call once in root layout or app.vue so a single connection is shared.
 * On 'news:published' / 'news:updated' refreshes index-top, index-region, index-general and section-news-{slug}.
 */
export function useNewsLive() {
  if (import.meta.server) return { refreshTrigger };

  const apiBase = useApiBase();
  const socketOrigin = resolveClientPublicOrigin(apiBase);

  let socket: ReturnType<typeof io> | null = null;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    try {
      socket = io(socketOrigin, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      socket.on('news:published', handleNewsEvent);
      socket.on('news:updated', handleNewsEvent);
    } catch (e) {
      console.warn('useNewsLive:', e);
    }
  }

  onMounted(() => {
    // Defer Socket.IO connection until after the page is interactive (≥2 s).
    // Socket.IO client is ~150 KB of JS — parsing it on the critical path
    // adds 80–120 ms of blocking time on mobile (TBT). Delaying init lets
    // the browser finish painting and become interactive first; the WebSocket
    // connection then opens in the background without affecting LCP/TBT.
    connectTimer = setTimeout(() => connect(), 2000);
  });

  onUnmounted(() => {
    if (connectTimer !== null) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  });

  return { refreshTrigger };
}

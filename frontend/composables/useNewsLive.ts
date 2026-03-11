import { ref, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

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

  let socket: ReturnType<typeof io> | null = null;

  function connect() {
    try {
      socket = io(apiBase, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('news:published', handleNewsEvent);
      socket.on('news:updated', handleNewsEvent);
    } catch (e) {
      console.warn('useNewsLive:', e);
    }
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  });

  return { refreshTrigger };
}

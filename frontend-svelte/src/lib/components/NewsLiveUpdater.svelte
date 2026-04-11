<script lang="ts">
  /**
   * Connects to the Socket.IO backend and triggers SvelteKit data invalidation
   * when news:published or news:updated events arrive.
   *
   * Deferred by 2 s so Socket.IO (~150 KB) doesn't block LCP/TBT.
   * Placed once in +layout.svelte so a single connection is shared across pages.
   */
  import { onMount, onDestroy } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { resolveClientPublicOrigin } from '$lib/utils/socketOrigin.js';
  import { refreshTrigger } from '$lib/stores/newsLive.js';

  let { apiBase }: { apiBase: string } = $props();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let socket: any = null;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;

  function handleNewsEvent() {
    invalidate('app:news');
    refreshTrigger.update((n) => n + 1);
  }

  onMount(() => {
    connectTimer = setTimeout(async () => {
      try {
        const { io } = await import('socket.io-client');
        const origin = resolveClientPublicOrigin(apiBase);
        socket = io(origin, {
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
        console.warn('[NewsLiveUpdater]', e);
      }
    }, 2000);
  });

  onDestroy(() => {
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
</script>

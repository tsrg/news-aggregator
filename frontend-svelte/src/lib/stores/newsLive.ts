import { writable } from 'svelte/store';

/**
 * Increments when a news:published or news:updated WebSocket event is received.
 * Consumed by NewsLiveUpdater.svelte which also calls SvelteKit's invalidate().
 */
export const refreshTrigger = writable(0);

/**
 * Declares Nuxt auto-imported composables so IDEs/TypeScript recognize them
 * when the project is opened from a parent workspace (e.g. monorepo root).
 * Nuxt still auto-imports these at build time; this file is for type-checking only.
 */
import type { Ref } from 'vue';

declare global {
  function useFetch<T>(
    url: string | (() => string),
    options?: Record<string, unknown>
  ): Promise<{ data: Ref<T | null>; pending: Ref<boolean>; error: Ref<Error | null>; refresh: () => Promise<void> }>;
  function useApiBase(): string;
}

export {};

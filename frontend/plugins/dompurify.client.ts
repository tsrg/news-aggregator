/**
 * Deferred DOMPurify loading to reduce TBT: the library is loaded only when
 * sanitization is first needed, not at app startup.
 */
let domPurifyPromise: Promise<typeof import('dompurify').default> | null = null;

function getDOMPurify() {
  if (!domPurifyPromise) {
    domPurifyPromise = import('dompurify').then((m) => m.default);
  }
  return domPurifyPromise;
}

export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    return {
      provide: {
        sanitize: (html: string) => html,
      },
    };
  }
  return {
    provide: {
      /** Async sanitization; use in components so DOMPurify loads only when needed. */
      sanitize: (html: string): Promise<string> =>
        getDOMPurify().then((DOMPurify) =>
          DOMPurify.sanitize(html, {
            ALLOW_DATA_ATTR: true,
          }),
        ),
    },
  };
});

import DOMPurify from 'dompurify';

export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    (window as unknown as { DOMPurify?: typeof DOMPurify }).DOMPurify = DOMPurify;
  }
  return {
    provide: {
      sanitize: (html: string) => (import.meta.client ? DOMPurify.sanitize(html) : html),
    },
  };
});

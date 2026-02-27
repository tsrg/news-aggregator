/**
 * Load Inter font asynchronously so it does not block FCP.
 * Uses media="print" + onload to make the stylesheet non-render-blocking.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
});

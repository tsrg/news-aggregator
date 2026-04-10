/**
 * Load Inter font asynchronously so it does not block FCP.
 * Previously loaded from Google Fonts (2 external round-trips: googleapis.com + gstatic.com).
 * Now served from the same origin (/fonts/inter.css) — no DNS lookup, no CORS preflight,
 * and the woff2 files are preloaded in <head> for even faster delivery.
 * font-display:optional in inter.css prevents FOUT and layout shifts.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/fonts/inter.css';
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
});

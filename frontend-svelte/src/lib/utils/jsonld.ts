/**
 * Safely stringify a schema.org object for use with {@html} in <svelte:head>.
 * Escapes "</script>" sequences so the closing tag can't break out of the
 * <script type="application/ld+json"> block.
 */
export function jsonLd(schema: unknown): string {
  const json = JSON.stringify(schema).replace(/<\/script>/gi, '<\\/script>');
  return `<script type="application/ld+json">${json}<\/script>`;
}

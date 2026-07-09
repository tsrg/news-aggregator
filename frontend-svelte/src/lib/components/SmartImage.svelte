<script lang="ts">
  /**
   * Картинка с skeleton-заглушкой и плавным fade-in после загрузки.
   * Контейнер должен задавать размер сам (aspect-* / w/h), компонент только
   * рисует img + shimmer-фон под ней.
   */
  let {
    src,
    alt = '',
    imgClass = '',
    loading,
    fetchpriority,
    decoding,
  }: {
    src: string;
    alt?: string;
    imgClass?: string;
    loading?: 'lazy' | 'eager';
    fetchpriority?: 'high' | 'low' | 'auto';
    decoding?: 'sync' | 'async' | 'auto';
  } = $props();

  let imgEl = $state<HTMLImageElement | null>(null);
  let loaded = $state(false);

  $effect(() => {
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      loaded = true;
    }
  });
</script>

<div class="absolute inset-0 {loaded ? '' : 'img-skeleton'}"></div>
<img
  bind:this={imgEl}
  {src}
  {alt}
  {loading}
  {fetchpriority}
  {decoding}
  class="img-fade-in {loaded ? 'is-loaded' : ''} {imgClass}"
  onload={() => (loaded = true)}
  onerror={() => (loaded = true)}
/>

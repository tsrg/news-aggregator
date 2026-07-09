<script lang="ts">
  type NewsItem = {
    id: string;
    title: string;
    summary?: string | null;
    imageUrl?: string | null;
    sourcePublishedAt?: string | null;
    publishedAt?: string | null;
    source?: { name: string } | null;
  };

  let {
    item,
    featured = false,
    imagePosition = 'top',
    priority = false,
  }: {
    item: NewsItem;
    featured?: boolean;
    imagePosition?: 'top' | 'left';
    priority?: boolean;
  } = $props();

  // Derive modern-format URLs from the stored JPEG imageUrl.
  // Convention: uuid.jpg in DB → uuid.avif / uuid.webp / uuid-sm.avif / uuid-sm.webp
  // Only applies to URLs ending in .jpg (our upload pipeline).
  const isOurImage = $derived(Boolean(item.imageUrl && /\.jpg$/i.test(item.imageUrl)));
  const avifSrc    = $derived(isOurImage ? item.imageUrl!.replace(/\.jpg$/i, '.avif')    : null);
  const webpSrc    = $derived(isOurImage ? item.imageUrl!.replace(/\.jpg$/i, '.webp')    : null);
  const avifSmSrc  = $derived(isOurImage ? item.imageUrl!.replace(/\.jpg$/i, '-sm.avif') : null);
  const webpSmSrc  = $derived(isOurImage ? item.imageUrl!.replace(/\.jpg$/i, '-sm.webp') : null);
  const jpegSmSrc  = $derived(isOurImage ? item.imageUrl!.replace(/\.jpg$/i, '-sm.jpg')  : null);

  function formatDate(d: string | null | undefined): string {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const isSameDay =
      now.getUTCDate() === date.getUTCDate() &&
      now.getUTCMonth() === date.getUTCMonth() &&
      now.getUTCFullYear() === date.getUTCFullYear();
    if (isSameDay) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  const displayDate = $derived(item.sourcePublishedAt || item.publishedAt);

  let imgEl = $state<HTMLImageElement | null>(null);
  let imgLoaded = $state(false);
  // Если картинка пришла из кэша, событие load не сработает — проверим вручную
  $effect(() => {
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      imgLoaded = true;
    }
  });
</script>

<a
  href="/news/{item.id}"
  class="group block bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-[transform,box-shadow] duration-300 border border-gray-100 h-full flex flex-col"
>
  <div class={['flex flex-col gap-0 h-full', imagePosition === 'left' ? 'md:flex-row' : ''].join(' ')}>
    {#if item.imageUrl}
      <div
        class={[
          'overflow-hidden w-full relative',
          imgLoaded ? 'bg-gray-100' : 'img-skeleton',
          imagePosition === 'left' ? 'md:w-2/5 shrink-0' : '',
          featured ? 'aspect-video' : 'aspect-[4/3]',
        ].join(' ')}
      >
        <!--
          <picture> with AVIF → WebP → JPEG fallback.
          srcset 420w / 1200w serves mobile-optimised variants automatically.
        -->
        <picture>
          {#if avifSrc}
            <source
              srcset="{avifSmSrc} 420w, {avifSrc} 1200w"
              sizes="(max-width: 640px) 420px, 1200px"
              type="image/avif"
            />
          {/if}
          {#if webpSrc}
            <source
              srcset="{webpSmSrc} 420w, {webpSrc} 1200w"
              sizes="(max-width: 640px) 420px, 1200px"
              type="image/webp"
            />
          {/if}
          <img
            bind:this={imgEl}
            src={item.imageUrl}
            srcset={jpegSmSrc ? `${jpegSmSrc} 420w, ${item.imageUrl} 1200w` : undefined}
            sizes={jpegSmSrc ? '(max-width: 640px) 420px, 1200px' : undefined}
            alt={item.title || ''}
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out img-fade-in {imgLoaded ? 'is-loaded' : ''}"
            loading={priority ? undefined : 'lazy'}
            fetchpriority={priority ? 'high' : undefined}
            decoding={priority ? 'async' : undefined}
            onload={() => (imgLoaded = true)}
            onerror={() => (imgLoaded = true)}
          />
        </picture>
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    {/if}

    <div class="flex flex-col justify-between flex-1 p-5 md:p-6 bg-white">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-blue-600 mb-3">
          {#if item.source?.name}
            <span class="px-2.5 py-1 bg-blue-50 rounded-full">{item.source.name}</span>
          {/if}
          <span class="text-gray-400">{formatDate(displayDate)}</span>
        </div>
        <h2
          class={[
            'font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors',
            featured ? 'text-2xl md:text-4xl mb-4' : 'text-lg md:text-xl mb-3',
          ].join(' ')}
        >
          {item.title}
        </h2>
        {#if item.summary}
          <p
            class={[
              'text-gray-500 leading-relaxed',
              featured ? 'text-base md:text-lg mb-6 line-clamp-3' : 'text-sm mb-4 line-clamp-2',
            ].join(' ')}
          >
            {item.summary}
          </p>
        {/if}
      </div>
    </div>
  </div>
</a>

<template>
  <div v-if="creatives.length" :class="wrapperClass">
    <div
      v-for="c in creatives"
      :key="c.id"
      class="rounded-2xl border border-gray-100 bg-white p-3 md:p-4 shadow-sm"
      :data-erid="c.marking?.erid || undefined"
      :data-ad-registry="c.internalRegistryId"
    >
      <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2 font-medium">Реклама</p>
      <template v-if="c.type === 'BANNER'">
        <a
          v-if="c.imageUrl && c.targetUrl"
          :href="c.targetUrl"
          :target="c.openInNewTab ? '_blank' : undefined"
          :rel="c.openInNewTab ? 'noopener sponsored' : 'sponsored'"
          class="block rounded-xl overflow-hidden"
        >
          <img :src="c.imageUrl" :alt="c.altText || 'Реклама'" class="w-full h-auto object-contain max-h-[320px]" loading="lazy" decoding="async" />
        </a>
        <img
          v-else-if="c.imageUrl"
          :src="c.imageUrl"
          :alt="c.altText || 'Реклама'"
          class="w-full h-auto object-contain max-h-[320px] rounded-xl"
          loading="lazy"
          decoding="async"
        />
      </template>
      <YandexRtbBlock
        v-else-if="c.type === 'YANDEX_RTB' && yandexBlockId(c)"
        :block-id="yandexBlockId(c)!"
      />
      <p class="text-xs text-gray-500 mt-2 leading-relaxed">
        <span v-if="c.marking?.erid">erid: {{ c.marking.erid }}</span>
        <span v-if="c.marking?.advertiserName">
          <span v-if="c.marking?.erid"> · </span>{{ c.marking.advertiserName }}
        </span>
        <span v-if="c.marking?.advertiserInn"> · ИНН {{ c.marking.advertiserInn }}</span>
        <span v-if="c.marking?.advertiserOgrn"> · ОГРН {{ c.marking.advertiserOgrn }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Marking = {
  erid?: string;
  advertiserName?: string;
  advertiserInn?: string;
  advertiserOgrn?: string;
};

type BannerCreative = {
  id: string;
  type: 'BANNER';
  sortOrder: number;
  internalRegistryId: string;
  marking: Marking;
  imageUrl?: string | null;
  targetUrl?: string | null;
  openInNewTab?: boolean;
  altText?: string | null;
};

type RtbCreative = {
  id: string;
  type: 'YANDEX_RTB';
  sortOrder: number;
  internalRegistryId: string;
  marking: Marking;
  yandexConfig?: Record<string, unknown> | null;
};

type AdsPayload = {
  byPlacement?: Record<string, Array<BannerCreative | RtbCreative>>;
};

const props = withDefaults(
  defineProps<{
    placementCode: string;
    wrapperClass?: string;
  }>(),
  {
    wrapperClass: 'flex flex-col gap-4 w-full',
  },
);

const apiBase = useApiBase();

const { data } = await useFetch<AdsPayload>(() => `${apiBase}/api/ads/active`, {
  key: 'public-ads-active',
});

const creatives = computed(() => {
  const list = data.value?.byPlacement?.[props.placementCode];
  return Array.isArray(list) ? list : [];
});

function yandexBlockId(c: BannerCreative | RtbCreative): string | null {
  if (c.type !== 'YANDEX_RTB') return null;
  const cfg = c.yandexConfig;
  if (!cfg || typeof cfg !== 'object') return null;
  const id = cfg.blockId ?? cfg.block_id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}
</script>

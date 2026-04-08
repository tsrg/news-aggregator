<template>
  <ClientOnly>
    <div :id="containerId" class="w-full min-h-[90px] bg-gray-50/50 rounded-xl border border-dashed border-gray-200" />
    <template #fallback>
      <div class="w-full min-h-[90px] bg-gray-50/50 rounded-xl border border-dashed border-gray-200 animate-pulse" />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { ensureYandexContextScript } from '../composables/useYandexContextAds';

const props = defineProps<{
  blockId: string;
}>();

const containerId = `ya-rtb-${Math.random().toString(36).slice(2, 9)}`;

onMounted(async () => {
  if (!props.blockId?.trim()) return;
  try {
    await ensureYandexContextScript();
  } catch {
    return;
  }
  const w = window as Window & {
    yaContextCb?: Array<() => void>;
    Ya?: { Context?: { AdvManager?: { render: (o: { blockId: string; renderTo: string }) => void } } };
  };
  w.yaContextCb = w.yaContextCb || [];
  w.yaContextCb.push(() => {
    try {
      w.Ya?.Context?.AdvManager?.render({
        blockId: props.blockId,
        renderTo: containerId,
      });
    } catch {
      /* ignore */
    }
  });
});
</script>

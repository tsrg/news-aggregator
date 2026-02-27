<template>
  <nav aria-label="Хлебные крошки" class="breadcrumbs">
    <NuxtLink to="/" class="breadcrumbs__home">Главная</NuxtLink>
    <span v-for="(item, i) in items" :key="`bc-${i}`" class="breadcrumbs__wrap">
      <span class="breadcrumbs__sep">/</span>
      <NuxtLink v-if="item.to" :to="item.to" class="breadcrumbs__item">{{ item.label }}</NuxtLink>
      <span v-else class="breadcrumbs__item breadcrumbs__item--current">{{ item.label }}</span>
    </span>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  items: { label: string; to?: string }[];
}>();
</script>

<style scoped>
.breadcrumbs {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
}
.breadcrumbs__home {
  color: #0d6efd;
  text-decoration: none;
}
.breadcrumbs__home:hover {
  text-decoration: underline;
}
.breadcrumbs__sep {
  margin: 0 0.35rem;
  color: #999;
}
.breadcrumbs__wrap {
  display: inline;
}
.breadcrumbs__item {
  color: #0d6efd;
  text-decoration: none;
}
.breadcrumbs__item:hover {
  text-decoration: underline;
}
.breadcrumbs__item--current {
  color: #333;
  cursor: default;
}
</style>

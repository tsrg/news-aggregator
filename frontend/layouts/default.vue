<template>
  <div class="layout">
    <header class="header">
      <NuxtLink to="/" class="logo">Новости</NuxtLink>
      <nav v-if="menuItems.length" class="nav">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.id"
          :to="item.url || (item.sectionId ? `/section/${sectionsMap.get(item.sectionId)?.slug}` : '#')"
          class="nav-link"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>
    <main class="main">
      <slot />
    </main>
    <footer v-if="footerItems.length" class="footer">
      <NuxtLink
        v-for="item in footerItems"
        :key="item.id"
        :to="item.url || '#'"
        class="footer-link"
      >
        {{ item.label }}
      </NuxtLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
const apiBase = useApiBase();

const { data: sections } = await useFetch<{ id: string; slug: string }[]>(`${apiBase}/api/sections`);
const sectionsMap = computed(() => new Map((sections.value || []).map((s) => [s.id, s])));

const { data: headerData } = await useFetch<{ items?: { id: string; label: string; url?: string; sectionId?: string }[] }>(
  `${apiBase}/api/menus/header`
);
const { data: footerData } = await useFetch<{ items?: { id: string; label: string; url?: string; sectionId?: string }[] }>(
  `${apiBase}/api/menus/footer`
);

function flattenItems(items: { id: string; label: string; url?: string; sectionId?: string; children?: { id: string; label: string; url?: string; sectionId?: string }[] }[] | undefined): { id: string; label: string; url?: string; sectionId?: string }[] {
  if (!items) return [];
  const out: { id: string; label: string; url?: string; sectionId?: string }[] = [];
  for (const it of items) {
    out.push({ id: it.id, label: it.label, url: it.url, sectionId: it.sectionId });
    if (Array.isArray(it.children)) out.push(...flattenItems(it.children));
  }
  return out;
}

const menuItems = computed(() => flattenItems(headerData.value?.items));
const footerItems = computed(() => flattenItems(footerData.value?.items));
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  padding: 1rem 2rem;
  background: #1a1a2e;
  color: #eee;
  display: flex;
  align-items: center;
  gap: 2rem;
}
.logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: inherit;
  text-decoration: none;
}
.nav {
  display: flex;
  gap: 1.5rem;
}
.nav-link, .footer-link {
  color: #aaa;
  text-decoration: none;
}
.nav-link:hover, .footer-link:hover {
  color: #fff;
}
.main {
  flex: 1;
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}
.footer {
  padding: 1.5rem 2rem;
  background: #16213e;
  color: #aaa;
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}
</style>

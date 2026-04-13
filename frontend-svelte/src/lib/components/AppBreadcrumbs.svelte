<script lang="ts">
  let {
    items,
    class: className = '',
  }: { items: { label: string; to?: string }[]; class?: string } = $props();
</script>

<nav aria-label="Хлебные крошки" class="text-sm text-gray-500 flex flex-wrap items-center gap-1 {className}">
  <a href="/" class="text-blue-600 hover:underline">Главная</a>
  {#each items as item}
    <span class="text-gray-300">/</span>
    {#if item.to}
      <a href={item.to} class="text-blue-600 hover:underline">{item.label}</a>
    {:else}
      <span class="text-gray-700">{item.label}</span>
    {/if}
  {/each}
</nav>

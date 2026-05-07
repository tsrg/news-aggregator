<script lang="ts">
  let { data } = $props();

  type DigestItem = {
    id: string;
    date: string;
    status: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
    newsCount: number;
    articleTitle?: string;
    articleSummary?: string;
    podcastDuration?: number;
    generatedAt?: string;
  };

  const digests = $derived(data.digests as DigestItem[]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m} мин ${s} сек` : `${m} мин`;
  }

  function statusLabel(status: DigestItem['status']) {
    return { READY: 'Готов', GENERATING: 'Генерируется...', PENDING: 'Ожидание', FAILED: 'Ошибка' }[status];
  }

  function statusClass(status: DigestItem['status']) {
    return {
      READY: 'status-ready',
      GENERATING: 'status-generating',
      PENDING: 'status-pending',
      FAILED: 'status-failed',
    }[status];
  }

  function dateSlug(iso: string) {
    return iso.split('T')[0];
  }
</script>

<svelte:head>
  <title>Ежедневные дайджесты</title>
</svelte:head>

<main class="digest-list-page">
  <header class="page-header">
    <h1>Ежедневные дайджесты</h1>
    <p class="page-subtitle">Автоматические сводки новостей за каждый день</p>
  </header>

  {#if digests.length === 0}
    <div class="empty-state">
      <p>Дайджесты пока не созданы.</p>
    </div>
  {:else}
    <ul class="digest-list">
      {#each digests as digest (digest.id)}
        <li class="digest-card">
          <a href="/digest/{dateSlug(digest.date)}" class="digest-link">
            <div class="digest-meta">
              <time class="digest-date" datetime={digest.date}>{formatDate(digest.date)}</time>
              <span class="status-badge {statusClass(digest.status)}">{statusLabel(digest.status)}</span>
            </div>

            {#if digest.articleTitle}
              <h2 class="digest-title">{digest.articleTitle}</h2>
            {/if}

            {#if digest.articleSummary}
              <p class="digest-summary">{digest.articleSummary}</p>
            {/if}

            <div class="digest-stats">
              <span>📰 {digest.newsCount} новостей</span>
              {#if digest.podcastDuration}
                <span>🎙 {formatDuration(digest.podcastDuration)}</span>
              {/if}
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .digest-list-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  .page-subtitle {
    color: #666;
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #888;
  }

  .digest-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .digest-card {
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .digest-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .digest-link {
    display: block;
    padding: 1.25rem 1.5rem;
    text-decoration: none;
    color: inherit;
  }

  .digest-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .digest-date {
    font-size: 0.875rem;
    color: #888;
    font-weight: 500;
  }

  .status-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-weight: 600;
  }

  .status-ready { background: #d1fae5; color: #065f46; }
  .status-generating { background: #fef3c7; color: #92400e; }
  .status-pending { background: #e5e7eb; color: #374151; }
  .status-failed { background: #fee2e2; color: #991b1b; }

  .digest-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    line-height: 1.4;
  }

  .digest-summary {
    font-size: 0.9rem;
    color: #555;
    line-height: 1.5;
    margin: 0 0 0.75rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .digest-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: #888;
  }
</style>

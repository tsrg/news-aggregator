<script lang="ts">
  import { browser } from '$app/environment';

  let { data } = $props();
  const digest = $derived(data.digest);

  type ScriptLine = { speaker: 'A' | 'B'; text: string };
  type Topic = { title: string; talkingPoints: string[]; estimatedSeconds: number };

  const script = $derived(Array.isArray(digest.podcastScript) ? (digest.podcastScript as ScriptLine[]) : []);
  const topics = $derived(Array.isArray(digest.podcastTopics) ? (digest.podcastTopics as Topic[]) : []);

  // Active tab: article | podcast | raw
  let activeTab = $state<'article' | 'podcast' | 'raw'>('article');

  // Sanitize article body client-side
  let sanitizedBody = $state('');
  $effect(() => {
    const body = digest.articleBody ?? '';
    if (browser && body) {
      import('dompurify').then(({ default: DOMPurify }) => {
        sanitizedBody = DOMPurify.sanitize(body);
      });
    } else {
      sanitizedBody = body;
    }
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    return `~${m} минут`;
  }

  async function copyToClipboard(text: string, label: string) {
    if (browser) {
      await navigator.clipboard.writeText(text);
      alert(`${label} скопирован в буфер обмена`);
    }
  }

  function downloadText(content: string, filename: string) {
    if (!browser) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scriptToText(lines: ScriptLine[]) {
    return lines.map((l) => `[${l.speaker === 'A' ? 'Ведущий А' : 'Ведущий Б'}] ${l.text}`).join('\n\n');
  }
</script>

<svelte:head>
  <title>{digest.articleTitle ?? 'Дайджест'} — {formatDate(digest.date)}</title>
</svelte:head>

<main class="digest-page">
  <nav class="breadcrumb">
    <a href="/digest">← Все дайджесты</a>
  </nav>

  <header class="digest-header">
    <time class="digest-date" datetime={digest.date}>{formatDate(digest.date)}</time>
    <h1 class="digest-title">{digest.articleTitle ?? 'Дайджест дня'}</h1>
    {#if digest.articleSummary}
      <p class="digest-lead">{digest.articleSummary}</p>
    {/if}
    <div class="digest-stats">
      <span>📰 {digest.newsCount} новостей</span>
      {#if digest.podcastDuration}
        <span>🎙 {formatDuration(digest.podcastDuration)}</span>
      {/if}
    </div>
  </header>

  <!-- Tabs -->
  <div class="tabs" role="tablist">
    <button
      role="tab"
      aria-selected={activeTab === 'article'}
      class="tab-btn"
      class:active={activeTab === 'article'}
      onclick={() => (activeTab = 'article')}
    >
      📄 Статья
    </button>
    <button
      role="tab"
      aria-selected={activeTab === 'podcast'}
      class="tab-btn"
      class:active={activeTab === 'podcast'}
      onclick={() => (activeTab = 'podcast')}
    >
      🎙 Подкаст
    </button>
    <button
      role="tab"
      aria-selected={activeTab === 'raw'}
      class="tab-btn"
      class:active={activeTab === 'raw'}
      onclick={() => (activeTab = 'raw')}
    >
      { } JSON
    </button>
  </div>

  <!-- Article tab -->
  {#if activeTab === 'article'}
    <section class="tab-content article-tab" role="tabpanel">
      {#if sanitizedBody}
        <div class="article-body prose">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html sanitizedBody}
        </div>
      {:else}
        <p class="empty-note">Текст статьи отсутствует.</p>
      {/if}
    </section>
  {/if}

  <!-- Podcast tab -->
  {#if activeTab === 'podcast'}
    <section class="tab-content podcast-tab" role="tabpanel">

      {#if digest.podcastPrompt}
        <div class="podcast-section">
          <div class="section-header">
            <h2>Промт для TTS-сервиса</h2>
            <div class="section-actions">
              <button class="btn-outline" onclick={() => copyToClipboard(digest.podcastPrompt!, 'Промт')}>
                Копировать
              </button>
            </div>
          </div>
          <pre class="prompt-box">{digest.podcastPrompt}</pre>
        </div>
      {/if}

      {#if digest.podcastVoiceStyle}
        <div class="podcast-section">
          <h2>Стиль голоса</h2>
          <p class="voice-style">{digest.podcastVoiceStyle}</p>
        </div>
      {/if}

      {#if topics.length > 0}
        <div class="podcast-section">
          <h2>Темы подкаста</h2>
          <div class="topics-list">
            {#each topics as topic, i (i)}
              <div class="topic-card">
                <h3>{topic.title}</h3>
                {#if topic.talkingPoints?.length}
                  <ul>
                    {#each topic.talkingPoints as point (point)}
                      <li>{point}</li>
                    {/each}
                  </ul>
                {/if}
                {#if topic.estimatedSeconds}
                  <span class="topic-duration">~{Math.round(topic.estimatedSeconds / 60)} мин</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if script.length > 0}
        <div class="podcast-section">
          <div class="section-header">
            <h2>Сценарий ({script.length} реплик)</h2>
            <div class="section-actions">
              <button class="btn-outline" onclick={() => copyToClipboard(scriptToText(script), 'Сценарий')}>
                Копировать
              </button>
              <button class="btn-outline" onclick={() => downloadText(scriptToText(script), `podcast-script-${data.date}.txt`)}>
                Скачать .txt
              </button>
            </div>
          </div>
          <div class="script-list">
            {#each script as line, i (i)}
              <div class="script-line" class:speaker-a={line.speaker === 'A'} class:speaker-b={line.speaker === 'B'}>
                <span class="speaker-label">{line.speaker === 'A' ? 'Ведущий А' : 'Ведущий Б'}</span>
                <p class="line-text">{line.text}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if digest.podcastSoundscapePrompt}
        <div class="podcast-section">
          <div class="section-header">
            <h2>Промт для фоновой музыки</h2>
            <button class="btn-outline" onclick={() => copyToClipboard(digest.podcastSoundscapePrompt!, 'Промт музыки')}>
              Копировать
            </button>
          </div>
          <pre class="prompt-box">{digest.podcastSoundscapePrompt}</pre>
        </div>
      {/if}

    </section>
  {/if}

  <!-- Raw JSON tab -->
  {#if activeTab === 'raw'}
    <section class="tab-content raw-tab" role="tabpanel">
      <div class="section-header" style="margin-bottom:1rem">
        <h2>Сырые данные (JSON)</h2>
        <button class="btn-outline" onclick={() => copyToClipboard(JSON.stringify(digest, null, 2), 'JSON')}>
          Копировать
        </button>
      </div>
      <pre class="raw-json">{JSON.stringify(digest, null, 2)}</pre>
    </section>
  {/if}
</main>

<style>
  .digest-page {
    max-width: 860px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .breadcrumb {
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .breadcrumb a {
    color: #4b5563;
    text-decoration: none;
  }

  .breadcrumb a:hover { text-decoration: underline; }

  .digest-header {
    margin-bottom: 2rem;
  }

  .digest-date {
    font-size: 0.875rem;
    color: #888;
    font-weight: 500;
  }

  .digest-title {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.3;
    margin: 0.5rem 0;
  }

  .digest-lead {
    font-size: 1.05rem;
    color: #444;
    line-height: 1.6;
    margin: 0.75rem 0 1rem;
  }

  .digest-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: #888;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 1.5rem;
  }

  .tab-btn {
    padding: 0.6rem 1.25rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn:hover { color: #111; }
  .tab-btn.active { color: #111; border-bottom-color: #111; }

  .tab-content { min-height: 200px; }

  /* Article */
  .article-body :global(h2) { font-size: 1.2rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
  .article-body :global(p) { line-height: 1.7; margin-bottom: 1rem; }
  .article-body :global(ul) { padding-left: 1.5rem; margin-bottom: 1rem; }
  .article-body :global(li) { line-height: 1.6; margin-bottom: 0.4rem; }
  .article-body :global(strong) { font-weight: 600; }
  .article-body :global(a) { color: #2563eb; text-decoration: underline; }

  .empty-note { color: #888; font-style: italic; }

  /* Podcast */
  .podcast-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .podcast-section:last-child { border-bottom: none; }

  .podcast-section h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .section-header h2 { margin: 0; }

  .section-actions { display: flex; gap: 0.5rem; }

  .btn-outline {
    padding: 0.35rem 0.85rem;
    border: 1px solid #d1d5db;
    border-radius: 0.4rem;
    background: #fff;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-outline:hover { background: #f9fafb; }

  .prompt-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    font-size: 0.85rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0.75rem 0 0;
  }

  .voice-style {
    color: #444;
    line-height: 1.6;
    font-style: italic;
  }

  /* Topics */
  .topics-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .topic-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.875rem 1rem;
  }

  .topic-card h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }

  .topic-card ul {
    padding-left: 1.25rem;
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: #555;
  }

  .topic-card li { margin-bottom: 0.25rem; line-height: 1.5; }

  .topic-duration { font-size: 0.75rem; color: #888; }

  /* Script */
  .script-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .script-line {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .speaker-label {
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    padding-top: 0.2rem;
    min-width: 80px;
  }

  .speaker-a .speaker-label { color: #1d4ed8; }
  .speaker-b .speaker-label { color: #7c3aed; }

  .line-text {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #222;
  }

  /* Raw JSON */
  .raw-json {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    font-size: 0.78rem;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre;
    max-height: 600px;
    overflow-y: auto;
  }
</style>

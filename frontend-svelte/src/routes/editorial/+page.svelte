<script lang="ts">
  import AppBreadcrumbs from '$lib/components/AppBreadcrumbs.svelte';
  import { webPageSchema, breadcrumbSchema } from '$lib/utils/schemaOrg.js';
  import { jsonLd } from '$lib/utils/jsonld.js';
</script>

<svelte:head>
  <title>Редакция | Иваново Онлайн</title>
  <meta name="description" content="Информация о редакции Иваново Онлайн. Наша команда, принципы работы и контакты." />
  <meta property="og:title" content="Редакция — Иваново Онлайн" />
  <link rel="canonical" href="https://ivanovo.online/editorial" />
  {@html jsonLd(webPageSchema({ title: 'Редакция', description: 'Информация о редакции Иваново Онлайн', url: '/editorial' }))}
  {@html jsonLd(breadcrumbSchema([{ name: 'Главная', url: '/' }, { name: 'Редакция' }]))}
</svelte:head>

<div class="max-w-3xl mx-auto">
  <AppBreadcrumbs items={[{ label: 'Редакция' }]} class="mb-8" />

  <article class="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm">
    <h1 class="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">Редакция</h1>

    <div class="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed">
      <p class="text-xl text-gray-500 mb-8">
        Команда профессионалов, ежедневно работающих над тем, чтобы вы получали
        актуальную и достоверную информацию о событиях в Ивановской области.
      </p>

      <h2>Принципы работы</h2>
      <ul>
        <li><strong>Объективность</strong> — мы представляем разные точки зрения на события</li>
        <li><strong>Достоверность</strong> — каждая новость проверяется перед публикацией</li>
        <li><strong>Оперативность</strong> — мы стремимся первыми сообщать о важных событиях</li>
        <li><strong>Открытость</strong> — мы всегда готовы к диалогу с читателями</li>
      </ul>

      <h2>Обратная связь</h2>
      <ul>
        <li>Email редакции: <a href="mailto:editor@ivanovo.online">editor@ivanovo.online</a></li>
        <li>Вакансии: <a href="mailto:jobs@ivanovo.online">jobs@ivanovo.online</a></li>
      </ul>
    </div>
  </article>
</div>

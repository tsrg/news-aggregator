<script lang="ts">
  import AppBreadcrumbs from '$lib/components/AppBreadcrumbs.svelte';
  import { webPageSchema, breadcrumbSchema } from '$lib/utils/schemaOrg.js';
  import { jsonLd } from '$lib/utils/jsonld.js';
</script>

<svelte:head>
  <title>О проекте | Иваново Онлайн</title>
  <meta name="description" content="Информация о новостном портале Иваново Онлайн. Наша миссия, редакционная политика и контакты." />
  <meta property="og:title" content="О проекте — Иваново Онлайн" />
  <link rel="canonical" href="https://ivanovo.online/about" />
  {@html jsonLd(webPageSchema({ title: 'О проекте', description: 'Информация о новостном портале Иваново Онлайн', url: '/about', type: 'AboutPage' }))}
  {@html jsonLd(breadcrumbSchema([{ name: 'Главная', url: '/' }, { name: 'О проекте' }]))}
</svelte:head>

<div class="max-w-3xl mx-auto">
  <AppBreadcrumbs items={[{ label: 'О проекте' }]} class="mb-8" />

  <article class="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm">
    <h1 class="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">О проекте</h1>

    <div class="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed">
      <p class="text-xl text-gray-500 mb-8">
        «Иваново Онлайн» — современный региональный новостной портал, созданный для оперативного
        информирования жителей Ивановской области о важнейших событиях региона.
      </p>

      <h2>Наша миссия</h2>
      <p>
        Мы стремимся предоставлять достоверную и актуальную информацию о жизни Иванова
        и Ивановской области. Наша цель — быть главным источником новостей для жителей региона,
        оперативно освещая события в сферах политики, общества, культуры, спорта и экономики.
      </p>

      <h2>Что мы предлагаем</h2>
      <ul>
        <li><strong>Оперативные новости</strong> — актуальная информация о событиях в регионе</li>
        <li><strong>Тематические разделы</strong> — удобная навигация по темам</li>
        <li><strong>Новости региона</strong> — специальный фокус на событиях Ивановской области</li>
        <li><strong>Удобный формат</strong> — современный дизайн и адаптивность для всех устройств</li>
      </ul>

      <h2>Редакционная политика</h2>
      <p>
        Мы придерживаемся принципов объективности и достоверности в освещении событий.
        Вся информация проходит проверку перед публикацией.
      </p>

      <h2>Контакты</h2>
      <ul>
        <li>Email: <a href="mailto:editor@ivanovo.online">editor@ivanovo.online</a></li>
        <li>Реклама: <a href="mailto:advertising@ivanovo.online">advertising@ivanovo.online</a></li>
      </ul>

      <h2>Юридическая информация</h2>
      <p>© 2026 «Иваново Онлайн». Все права защищены.</p>
    </div>
  </article>
</div>

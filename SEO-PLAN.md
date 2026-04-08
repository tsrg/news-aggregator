# SEO Plan: ivanovo.online

**Статус:** Действующий план по улучшению SEO  
**Создан:** 17 марта 2026  
**Обновлен:** —  
**Ответственный:** —  

---

## 📊 Текущее состояние


| Метрика             | Значение   | Цель               |
| ------------------- | ---------- | ------------------ |
| SEO Health Score    | 52/100     | 85/100             |
| Индексация          | Неизвестно | 100% страниц       |
| Органический трафик | Базовый    | +200% за 6 месяцев |
| AI-цитируемость     | 0%         | 30%                |


---

## 🎯 Стратегические цели

### Q2 2026 (Апрель — Июнь)

1. Исправить все критические технические проблемы
2. Достичь SEO Health Score 70/100
3. Получить индексацию всех разделов в Google

### Q3 2026 (Июль — Сентябрь)

1. Достичь SEO Health Score 85/100
2. Начать получать трафик из AI-поисковых систем
3. Запустить оригинальный контент

### Q4 2026 (Октябрь — Декабрь)

1. Выстроить E-E-A-T сигналы
2. Достичь стабильного органического трафика

---

## 🚨 Фаза 1: Критические исправления (Неделя 1-2)

### 1.1 Техническая инфраструктура

#### Задача 1.1.1: Создать robots.txt

**Приоритет:** Critical  
**Срок:** День 1  
**Сложность:** Низкая  
**Ответственный:** DevOps / Backend

**Требования:**

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*?*

Sitemap: https://ivanovo.online/sitemap.xml

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /
```

**Проверка:**

```bash
curl https://ivanovo.online/robots.txt
```

---

#### Задача 1.1.2: Создать XML Sitemap

**Приоритет:** Critical  
**Срок:** День 2-3  
**Сложность:** Средняя  
**Ответственный:** Backend

**Формат:** Динамический sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://ivanovo.online/sitemap-main.xml</loc>
    <lastmod>2026-03-17</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://ivanovo.online/sitemap-news.xml</loc>
    <lastmod>2026-03-17</lastmod>
  </sitemap>
</sitemapindex>
```

**Код (Nuxt/Nitro):**

```typescript
// server/routes/sitemap.xml.ts
import { SitemapStream, streamToPromise } from 'sitemap'

export default defineEventHandler(async (event) => {
  const sitemap = new SitemapStream({ 
    hostname: 'https://ivanovo.online' 
  })
  
  sitemap.write({ 
    url: '/', 
    changefreq: 'daily', 
    priority: 1.0 
  })
  
  const sections = ['politics', 'society', 'sport', 'culture', 'economy', 'region']
  sections.forEach(section => {
    sitemap.write({ 
      url: `/section/${section}`, 
      changefreq: 'hourly', 
      priority: 0.8 
    })
  })
  
  const news = await fetchNewsForSitemap()
  news.forEach(item => {
    sitemap.write({
      url: `/news/${item.id}`,
      lastmod: item.updatedAt,
      changefreq: 'never',
      priority: 0.9
    })
  })
  
  sitemap.end()
  
  const buffer = await streamToPromise(sitemap)
  
  setResponseHeader(event, 'Content-Type', 'application/xml')
  return buffer.toString()
})
```

---

#### Задача 1.1.3: Security Headers

**Приоритет:** Critical  
**Срок:** День 2  
**Сложность:** Низкая  
**Ответственный:** DevOps

**Nginx конфигурация:**

```nginx
server {
    listen 443 ssl http2;
    server_name ivanovo.online;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    add_header Strict-Transport-Security 
        "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy 
        "geolocation=(), microphone=(), camera=()" always;
    
    # CSP report-only
    add_header Content-Security-Policy-Report-Only 
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
         style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
         font-src 'self' https://fonts.gstatic.com; 
         img-src 'self' https: data:; 
         connect-src 'self' https://ivanovo.online; 
         frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
}
```

---

### 1.2 On-Page SEO

#### Задача 1.2.1: SSR Meta Tags

**Приоритет:** Critical  
**Срок:** День 3-5  
**Сложность:** Средняя  
**Ответственный:** Frontend

**Главная страница:**

```vue
<script setup>
useHead({
  title: 'Иваново Онлайн — главные новости Ивановской области',
  titleTemplate: '%s | Иваново Онлайн',
  meta: [
    { 
      name: 'description', 
      content: 'Свежие новости Иванова и Ивановской области. Политика, общество, спорт, культура, экономика.' 
    },
    { 
      name: 'keywords', 
      content: 'новости Иваново, Ивановская область, региональные новости' 
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Иваново Онлайн' },
    { property: 'og:title', content: 'Иваново Онлайн — главные новости' },
    { property: 'og:description', content: 'Свежие новости Ивановской области' },
    { property: 'og:image', content: 'https://ivanovo.online/og-image.jpg' },
    { property: 'og:url', content: 'https://ivanovo.online/' },
    { property: 'og:locale', content: 'ru_RU' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Иваново Онлайн — главные новости' },
    { name: 'twitter:description', content: 'Свежие новости Ивановской области' },
    { name: 'twitter:image', content: 'https://ivanovo.online/og-image.jpg' },
  ],
  link: [
    { rel: 'canonical', href: 'https://ivanovo.online/' }
  ]
})
</script>
```

**Страница новости:**

```vue
<script setup>
const { id } = useRoute().params
const { data: news } = await useFetch(`/api/news/${id}`)

useHead(() => ({
  title: news.value?.title,
  meta: [
    { 
      name: 'description', 
      content: news.value?.lead || truncate(news.value?.content, 160) 
    },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: news.value?.title },
    { property: 'og:description', content: news.value?.lead },
    { property: 'og:image', content: news.value?.imageUrl },
    { property: 'article:published_time', content: news.value?.publishedAt },
    { property: 'article:modified_time', content: news.value?.updatedAt },
    { property: 'article:section', content: news.value?.section },
    { property: 'article:author', content: news.value?.author?.name },
  ],
  link: [
    { rel: 'canonical', href: `https://ivanovo.online/news/${id}` }
  ]
}))
</script>
```

---

## 🔧 Фаза 2: Структурированные данные (Неделя 3-4)

### 2.1 JSON-LD Schema Markup

#### Задача 2.1.1: Organization Schema

**Приоритет:** High  
**Срок:** Неделя 3

```vue
<script setup>
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Иваново Онлайн',
        alternateName: 'Ivanovo Online',
        url: 'https://ivanovo.online',
        logo: {
          '@type': 'ImageObject',
          url: 'https://ivanovo.online/logo.png',
          width: 512,
          height: 512
        },
        description: 'Региональный новостной портал Ивановской области',
        sameAs: [
          'https://vk.com/ivanovo.online',
          'https://t.me/ivanovo_online'
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Editorial',
          email: 'editor@ivanovo.online'
        }
      })
    }
  ]
})
</script>
```

---

#### Задача 2.1.2: NewsArticle Schema

**Приоритет:** High  
**Срок:** Неделя 3-4

```typescript
// composables/useNewsSchema.ts
export function useNewsSchema(news: NewsItem) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: news.title,
    description: news.lead,
    image: [news.imageUrl],
    datePublished: news.publishedAt,
    dateModified: news.updatedAt || news.publishedAt,
    author: {
      '@type': news.author?.type || 'Organization',
      name: news.author?.name || 'Редакция Иваново Онлайн',
      url: news.author?.profileUrl
    },
    publisher: {
      '@type': 'Organization',
      name: 'Иваново Онлайн',
      logo: {
        '@type': 'ImageObject',
        url: 'https://ivanovo.online/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://ivanovo.online/news/${news.id}`
    },
    articleSection: news.sectionName,
    keywords: news.tags?.join(', ')
  }
  
  useHead({
    script: [{
      type: 'application/ld+json',
      innerHTML: JSON.stringify(schema)
    }]
  })
}
```

---

#### Задача 2.1.3: BreadcrumbList Schema

**Приоритет:** Medium  
**Срок:** Неделя 4

```vue
<script setup>
const props = defineProps<{
  items: Array<{ name: string; url?: string }>
}>()

const schema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: props.items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url ? `https://ivanovo.online${item.url}` : undefined
  }))
}))

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: computed(() => JSON.stringify(schema.value))
  }]
})
</script>
```

---

#### Задача 2.1.4: WebSite Schema + Search

**Приоритет:** Medium  
**Срок:** Неделя 4

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Иваново Онлайн",
  "url": "https://ivanovo.online",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://ivanovo.online/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

**Валидация:**

- [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results)
- [https://validator.schema.org/](https://validator.schema.org/)

---

## 📝 Фаза 3: Контент и E-E-A-T (Неделя 5-8)

### 3.1 Авторы и атрибуция

#### Задача 3.1.1: Добавить авторов к новостям

**Приоритет:** High  
**Срок:** Неделя 5

**Миграция БД:**

```sql
CREATE TABLE "Author" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "email" TEXT,
    "position" TEXT,
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "NewsItem" ADD COLUMN "authorId" TEXT REFERENCES "Author"("id");
```

**Страница автора:**

```vue
<script setup>
useHead({
  title: `${author.value.name} — автор Иваново Онлайн`,
  meta: [
    { name: 'description', content: author.value.bio }
  ]
})

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: author.value.name,
        description: author.value.bio,
        image: author.value.photoUrl,
        jobTitle: author.value.position,
        worksFor: {
          '@type': 'Organization',
          name: 'Иваново Онлайн'
        }
      }
    })
  }]
})
</script>
```

---

#### Задача 3.1.2: Даты публикации

**Приоритет:** High  
**Срок:** Неделя 5

```vue
<template>
  <article>
    <time :datetime="news.publishedAt">
      {{ formatDate(news.publishedAt) }}
    </time>
    <span v-if="isUpdated">
      (обновлено: {{ formatDate(news.updatedAt) }})
    </span>
  </article>
</template>
```

---

### 3.2 Статические страницы

#### Задача 3.2.1: Страница "О проекте"

**Приоритет:** High  
**Срок:** Неделя 6

**Обязательные элементы:**

- История издания
- Миссия и ценности
- Команда редакции (фото + био)
- Контактная информация
- Юридическая информация (ООО/ИП, ИНН)
- Редакционная политика
- Процесс фактчекинга

---

## 🤖 Фаза 4: AI Optimization / GEO (Неделя 7-10)

### 4.1 llms.txt

#### Задача 4.1.1: Создать /llms.txt

**Приоритет:** High  
**Срок:** Неделя 7

```
# Иваново Онлайн
> Региональный новостной агрегатор Ивановской области. 
> Оперативные новости политики, общества, спорта, культуры и экономики Иванова.

## Основные разделы
- [Главная](https://ivanovo.online/): Главные новости дня в Ивановской области
- [Новости региона](https://ivanovo.online/section/region): Новости Ивановской области
- [Политика](https://ivanovo.online/section/politics): Политические новости региона
- [Общество](https://ivanovo.online/section/society): Общественные события
- [Спорт](https://ivanovo.online/section/sport): Спортивные новости Иванова
- [Культура](https://ivanovo.online/section/culture): Культурная жизнь региона
- [Экономика](https://ivanovo.online/section/economy): Экономика и бизнес

## Информация о издании
- Основан: 2026 год
- Язык: русский
- Регион: Ивановская область, Россия
- Тип: новостной агрегатор

## Контакты редакции
- Email: editor@ivanovo.online
- Телефон: +7 (XXX) XXX-XX-XX
- Адрес: г. Иваново, ...

## Политики
- [Редакционная политика](https://ivanovo.online/editorial)
- [Политика конфиденциальности](https://ivanovo.online/privacy)
- [Правила использования](https://ivanovo.online/terms)

## RSS-ленты
- [Все новости](https://ivanovo.online/rss)
- [Новости региона](https://ivanovo.online/rss/region)
```

---

### 4.2 AI-читаемый контент

#### Задача 4.2.1: Оптимизировать структуру статей

**Приоритет:** Medium  
**Срок:** Неделя 8-10

**Структура идеальной статьи:**

1. Вопрос-ответ в начале (40-60 слов)
2. Основной пассаж (134-167 слов) с ключевыми фактами
3. Детали и контекст (остаток статьи)

**Пример:**

```markdown
## Что произошло?

17 марта 2026 года в Иванове открылся новый культурный центр 
"Текстильщик". На церемонии открытия присутствовали мэр города 
и представители областной администрации.

## Подробности

[Полная информация о проекте, цитаты, контекст...]
```

**Требования:**

- Заголовки H2/H3 в формате вопросов
- Короткие абзацы (2-4 предложения)
- Списки для перечислений
- Таблицы для сравнений
- Цитаты с атрибуцией

---

## 📈 Фаза 5: Расширенная оптимизация (Месяц 3-6)

### 5.1 Google News

#### Задача 5.1.1: Подготовка к Google News

**Приоритет:** Medium  
**Срок:** Месяц 3

**Требования:**

- Уникальные URL статей
- Постоянные URL
- Правильные даты
- Авторство
- Контактная информация

**Google News Sitemap:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://ivanovo.online/news/123</loc>
    <news:news>
      <news:publication>
        <news:name>Иваново Онлайн</news:name>
        <news:language>ru</news:language>
      </news:publication>
      <news:publication_date>2026-03-17T19:27:00+03:00</news:publication_date>
      <news:title>Заголовок новости</news:title>
      <news:keywords>новости, Иваново, спорт</news:keywords>
    </news:news>
  </url>
</urlset>
```

---

### 5.2 Core Web Vitals

#### Задача 5.2.1: Оптимизация LCP

**Приоритет:** Medium  
**Срок:** Месяц 3-4

**Действия:**

- Preload критических изображений
- Оптимизация hero-изображений
- Уменьшение TTFB

```vue
<Link rel="preload" as="image" :href="heroImage" fetchpriority="high" />
```

---

#### Задача 5.2.2: Оптимизация CLS

**Приоритет:** Medium  
**Срок:** Месяц 3

**Действия:**

- Фиксированные размеры для изображений
- Асинхронные шрифты с font-display: swap
- Резервирование места для динамического контента

---

### 5.3 Внутренняя перелинковка

#### Задача 5.3.1: Стратегия internal linking

**Приоритет:** Medium  
**Срок:** Месяц 4

**Правила:**

- 3-5 внутренних ссылок на статью
- Связанные новости в конце
- Теги как навигация
- Хлебные крошки (breadcrumbs)

---

## 🎯 Контрольные точки

### Неделя 2

- robots.txt работает
- sitemap.xml доступен
- Security headers настроены
- SSR meta tags работают
- Canonical URLs на всех страницах

### Месяц 1

- Schema.org разметка на всех типах страниц
- Авторы добавлены к новостям
- Даты отображаются корректно
- Страница "О проекте" запущена
- llms.txt создан

### Месяц 2

- E-E-A-T сигналы улучшены
- AI-оптимизированный контент
- Google Search Console настроен
- Core Web Vitals в зелёной зоне

### Месяц 3

- Подача в Google News
- Бэклинк-профиль начат
- Социальные сигналы активны

---

## 🛠 Инструменты для проверки

### Ежедневно

```bash
seo audit https://ivanovo.online
```

### Еженедельно

- Google Search Console
- PageSpeed Insights: [https://pagespeed.web.dev/](https://pagespeed.web.dev/)
- Schema Validator: [https://validator.schema.org/](https://validator.schema.org/)

### Ежемесячно

- Ahrefs / SEMrush для бэклинков
- Проверка позиций
- Анализ конкурентов

---

## 📞 Контакты и ресурсы

### Документация

- Nuxt SEO: [https://nuxtseo.com/](https://nuxtseo.com/)
- Google Search Central: [https://developers.google.com/search](https://developers.google.com/search)
- Schema.org: [https://schema.org/](https://schema.org/)

### Полезные сервисы

- [https://search.google.com/search-console](https://search.google.com/search-console)
- [https://pagespeed.web.dev/](https://pagespeed.web.dev/)
- [https://validator.schema.org/](https://validator.schema.org/)
- [https://securityheaders.com/](https://securityheaders.com/)

---

**Последнее обновление:** 17 марта 2026  
**Следующий review:** 1 апреля 2026
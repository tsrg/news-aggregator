/**
 * Schema.org JSON-LD helpers.
 * Each function returns a plain object to be embedded via <svelte:head>.
 */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Иваново Онлайн',
    alternateName: 'Ivanovo Online',
    url: 'https://ivanovo.online',
    logo: {
      '@type': 'ImageObject',
      url: 'https://ivanovo.online/logo.png',
      width: 512,
      height: 512,
    },
    description: 'Региональный новостной портал Ивановской области',
    sameAs: ['https://vk.com/ivanovo.online', 'https://t.me/ivanovo_online'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Editorial',
      email: 'editor@ivanovo.online',
      availableLanguage: ['Russian'],
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Иваново Онлайн',
    url: 'https://ivanovo.online',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://ivanovo.online/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function webPageSchema(opts: {
  title: string;
  description: string;
  url: string;
  type?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type || 'WebPage',
    name: opts.title,
    description: opts.description,
    url: `https://ivanovo.online${opts.url}`,
    isPartOf: { '@type': 'WebSite', name: 'Иваново Онлайн', url: 'https://ivanovo.online' },
    inLanguage: 'ru-RU',
  };
}

export function newsArticleSchema(article: {
  id: string;
  title: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  sourcePublishedAt?: string | null;
  publishedAt?: string;
  updatedAt?: string;
  section?: { slug: string; title: string } | null;
  source?: { name: string };
}) {
  const url = `https://ivanovo.online/news/${article.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description:
      article.summary || article.body?.substring(0, 160).replace(/<[^>]*>/g, '') || '',
    image: article.imageUrl ? [article.imageUrl] : undefined,
    datePublished: article.sourcePublishedAt || article.publishedAt || article.updatedAt,
    dateModified: article.updatedAt || article.publishedAt || article.sourcePublishedAt,
    author: { '@type': 'Organization', name: 'Редакция Иваново Онлайн' },
    publisher: {
      '@type': 'Organization',
      name: 'Иваново Онлайн',
      logo: { '@type': 'ImageObject', url: 'https://ivanovo.online/logo.png', width: 512, height: 512 },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: article.section?.title || 'Новости',
    url,
    inLanguage: 'ru-RU',
  };
}

export function breadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url ? `https://ivanovo.online${item.url}` : undefined,
    })),
  };
}

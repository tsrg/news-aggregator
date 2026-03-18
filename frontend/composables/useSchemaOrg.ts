interface NewsArticleData {
  id: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  body?: string;
  section?: { slug: string; title: string } | null;
  source?: { name: string };
  author?: { name: string; profileUrl?: string } | null;
}

interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function useOrganizationSchema() {
  const schema = {
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
      email: 'editor@ivanovo.online',
      availableLanguage: ['Russian']
    }
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema)
      }
    ]
  });
}

export function useWebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Иваново Онлайн',
    url: 'https://ivanovo.online',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://ivanovo.online/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema)
      }
    ]
  });
}

export function useNewsArticleSchema(article: Ref<NewsArticleData | null>) {
  const schema = computed(() => {
    if (!article.value) return null;

    const data = article.value;
    const url = `https://ivanovo.online/news/${data.id}`;
    
    return {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: data.title,
      description: data.summary || data.body?.substring(0, 160).replace(/<[^>]*>/g, '') || '',
      image: data.imageUrl ? [data.imageUrl] : undefined,
      datePublished: data.publishedAt || data.updatedAt,
      dateModified: data.updatedAt || data.publishedAt,
      author: data.author ? {
        '@type': 'Person',
        name: data.author.name,
        url: data.author.profileUrl
      } : {
        '@type': 'Organization',
        name: 'Редакция Иваново Онлайн'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Иваново Онлайн',
        logo: {
          '@type': 'ImageObject',
          url: 'https://ivanovo.online/logo.png',
          width: 512,
          height: 512
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url
      },
      articleSection: data.section?.title || 'Новости',
      url: url,
      inLanguage: 'ru-RU'
    };
  });

  useHead(() => ({
    script: schema.value ? [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema.value)
      }
    ] : []
  }));
}

export function useBreadcrumbSchema(items: Ref<BreadcrumbItem[]>) {
  const schema = computed(() => {
    if (!items.value?.length) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.value.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url ? `https://ivanovo.online${item.url}` : undefined
      }))
    };
  });

  useHead(() => ({
    script: schema.value ? [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema.value)
      }
    ] : []
  }));
}

export function useWebPageSchema(options: {
  title: string;
  description: string;
  url: string;
  type?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': options.type || 'WebPage',
    name: options.title,
    description: options.description,
    url: `https://ivanovo.online${options.url}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Иваново Онлайн',
      url: 'https://ivanovo.online'
    },
    inLanguage: 'ru-RU'
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema)
      }
    ]
  });
}

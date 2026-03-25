import axios from 'axios';
import * as cheerio from 'cheerio';

// Конфигурация селекторов для разных доменов
// Можно расширять через админку или БД
const DOMAIN_SELECTORS = {
  // РИА Новости
  'ria.ru': {
    title: 'h1',
    content: '[data-testid="article-body"], .article__text, .article__body, [itemprop="articleBody"]',
    removeSelectors: '.article__tags, .article__info, .banner, .advertisement, script, style',
  },
  // ТАСС
  'tass.ru': {
    title: 'h1',
    content: '.text-content, .article__content, [itemprop="articleBody"], .tass_article_body',
    removeSelectors: '.tags, .share, .banner, script, style',
  },
  // Lenta.ru
  'lenta.ru': {
    title: 'h1',
    content: '.topic-body__content, .article__text, [itemprop="articleBody"]',
    removeSelectors: '.topic-footer, .tags, .banner, script, style',
  },
  // РБК
  'rbc.ru': {
    title: 'h1',
    content: '.article__text, .article__content, [itemprop="articleBody"], .l-article__text',
    removeSelectors: '.article__tags, .article__info, .banner, script, style',
  },
  // Коммерсантъ
  'kommersant.ru': {
    title: 'h1',
    content: '.doc__body, .article_text, [itemprop="articleBody"]',
    removeSelectors: '.doc__footer, .tags, script, style',
  },
  // Известия
  'iz.ru': {
    title: 'h1',
    content: '.article__text, .text-content, [itemprop="articleBody"]',
    removeSelectors: '.article__tags, .banner, script, style',
  },
  // Вести
  'vesti.ru': {
    title: 'h1',
    content: '.article__text, .article-content, [itemprop="articleBody"]',
    removeSelectors: '.article__tags, .banner, script, style',
  },
  // Газета.ru
  'gazeta.ru': {
    title: 'h1',
    content: '.article__text, .article-text, [itemprop="articleBody"]',
    removeSelectors: '.article__tags, .banner, script, style',
  },
  // МК
  'mk.ru': {
    title: 'h1',
    content: '.article__text, .article-text, [itemprop="articleBody"]',
    removeSelectors: '.article__tags, .banner, script, style',
  },
  // NEWS.ru
  'news.ru': {
    title: 'h1',
    content: '.article-content, .article__text, [itemprop="articleBody"]',
    removeSelectors: '.article__tags, .banner, script, style',
  },
  // По умолчанию - универсальные селекторы
  'default': {
    title: 'h1',
    content: 'article, [itemprop="articleBody"], .article-body, .article__body, .article-text, .article__text, .content, .entry-content, .post-content, .news-text, .text-content, main',
    removeSelectors: 'script, style, nav, header, footer, .comments, .sidebar, .ads, .advertisement, .banner, .social-share, .tags',
  },
};

/**
 * Получает домен из URL
 */
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Находит подходящий конфиг для домена
 */
function getSelectorsForDomain(domain) {
  if (!domain) return DOMAIN_SELECTORS.default;
  
  // Прямое совпадение
  if (DOMAIN_SELECTORS[domain]) {
    return DOMAIN_SELECTORS[domain];
  }
  
  // Проверяем поддомены (например, moscow.ria.ru -> ria.ru)
  const parts = domain.split('.');
  if (parts.length > 2) {
    const mainDomain = parts.slice(-2).join('.');
    if (DOMAIN_SELECTORS[mainDomain]) {
      return DOMAIN_SELECTORS[mainDomain];
    }
  }
  
  return DOMAIN_SELECTORS.default;
}

/**
 * Очищает текст от лишних пробелов и пустых строк
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Дата публикации на стороне источника из HTML (meta / JSON-LD / time).
 * @param {*} $ cheerio root
 * @returns {Date|null}
 */
function extractPublishedFromDocument($) {
  const meta =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="article:published_time"]').attr('content') ||
    $('meta[property="og:article:published_time"]').attr('content') ||
    $('meta[property="article:published"]').attr('content');
  if (meta) {
    const d = new Date(String(meta).trim());
    if (!Number.isNaN(d.getTime())) return d;
  }
  const timeDt = $('time[datetime]').first().attr('datetime');
  if (timeDt) {
    const d = new Date(String(timeDt).trim());
    if (!Number.isNaN(d.getTime())) return d;
  }
  let fromJsonLd = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw || fromJsonLd) return;
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const dp =
          node.datePublished ||
          node.dateCreated ||
          (node.mainEntity && typeof node.mainEntity === 'object' && node.mainEntity.datePublished);
        if (dp) {
          const d = new Date(dp);
          if (!Number.isNaN(d.getTime())) {
            fromJsonLd = d;
            return false;
          }
        }
      }
    } catch {
      // ignore invalid JSON-LD
    }
  });
  if (fromJsonLd) return fromJsonLd;
  return null;
}

function isNoiseText(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes('поделиться') ||
    lower.includes('написать авторам') ||
    lower.includes('нашли ошибку') ||
    lower.includes('cookie') ||
    lower.includes('политик') ||
    lower.includes('реклама')
  );
}

/**
 * Парсит статью по URL
 * @param {string} url - URL статьи
 * @returns {Promise<{title: string|null, content: string|null, success: boolean, error?: string}>}
 */
export async function parseArticle(url) {
  try {
    if (!url) {
      return { success: false, error: 'URL is required', title: null, content: null, sourcePublishedAt: null };
    }

    const domain = getDomain(url);
    const selectors = getSelectorsForDomain(domain);

    // Загружаем страницу
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    const sourcePublishedAt = extractPublishedFromDocument($);

    // Удаляем ненужные элементы
    if (selectors.removeSelectors) {
      $(selectors.removeSelectors).remove();
    }

    // Извлекаем заголовок
    let title = null;
    if (selectors.title) {
      title = $(selectors.title).first().text().trim() || null;
    }
    // Fallback на meta title
    if (!title) {
      title = $('meta[property="og:title"]').attr('content') ||
              $('meta[name="twitter:title"]').attr('content') ||
              $('title').text().trim() || null;
    }

    // Извлекаем контент
    let content = null;
    const contentSelectors = selectors.content.split(',').map(s => s.trim());
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        // Получаем текст с сохранением структуры абзацев
        const paragraphs = [];
        element.find('p, h2, h3, h4, li').each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 10) { // Фильтруем короткие фрагменты
            paragraphs.push(text);
          }
        });

        // Если не нашли параграфы, берём весь текст
        if (paragraphs.length === 0) {
          content = element.text().trim();
          // Для сайтов с div-версткой без <p> пытаемся собрать читаемые блочные фрагменты.
          if (!content || content.length < 100) {
            const blockTexts = [];
            element.find('div').each((_, el) => {
              const text = $(el).text().trim();
              if (text.length > 40) {
                blockTexts.push(text);
              }
            });
            if (blockTexts.length > 0) {
              content = blockTexts.join('\n\n');
            }
          }
        } else {
          content = paragraphs.join('\n\n');
        }

        if (content && content.length > 100) {
          break;
        }
      }
    }

    // Если основные селекторы не сработали, пробуем универсальный подход
    if (!content || content.length < 100) {
      // Ищем блок с наибольшим количеством текста
      let bestContent = '';
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > bestContent.length) {
          bestContent = text;
        }
      });
      
      if (bestContent.length > 100) {
        // Собираем все параграфы из того же родителя
        const parent = $('p').toArray().find(el => $(el).text().trim() === bestContent);
        if (parent) {
          const parentEl = $(parent).parent();
          const texts = [];
          parentEl.find('p').each((_, el) => {
            const t = $(el).text().trim();
            if (t.length > 20) texts.push(t);
          });
          content = texts.join('\n\n');
        } else {
          content = bestContent;
        }
      }
    }

    // Последний универсальный fallback: ищем самый "текстовый" контейнер статьи.
    if (!content || content.length < 100) {
      const containers = $('main, article, [itemprop="articleBody"], [class*="article"], [class*="content"], [class*="news"], [class*="detail"]');
      let bestContainerText = '';

      containers.each((_, container) => {
        const blocks = [];
        $(container).find('p, div, li').each((__, el) => {
          const text = $(el).text().trim();
          if (text.length > 40 && !isNoiseText(text)) {
            blocks.push(text);
          }
        });

        const joined = blocks.join('\n\n');
        if (joined.length > bestContainerText.length) {
          bestContainerText = joined;
        }
      });

      if (bestContainerText.length > 100) {
        content = bestContainerText;
      }
    }

    content = content ? cleanText(content) : null;
    if (!content || content.length < 100) {
      return {
        success: false,
        error: 'Content not found',
        title,
        content: null,
        sourcePublishedAt,
      };
    }

    return {
      success: true,
      title,
      content,
      domain,
      sourcePublishedAt,
    };

  } catch (error) {
    console.error(`Failed to parse article ${url}:`, error.message);
    return {
      success: false,
      error: error.message,
      title: null,
      content: null,
      sourcePublishedAt: null,
    };
  }
}

/**
 * Быстро получает только заголовок статьи, без извлечения полного текста.
 * Используется при импорте sitemap, чтобы сразу сохранить человекочитаемый title.
 */
export async function parseArticleTitle(url) {
  try {
    if (!url) return null;

    const domain = getDomain(url);
    const selectors = getSelectorsForDomain(domain);

    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    const fromSelector = selectors.title ? $(selectors.title).first().text().trim() : '';
    const fromMeta = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text().trim();

    const title = (fromSelector || fromMeta || '').trim();
    return title || null;
  } catch {
    return null;
  }
}

/**
 * Обновляет новость полным текстом статьи
 * @param {string} newsItemId - ID новости
 * @param {string} url - URL статьи
 */
export async function enrichNewsItem(newsItemId, url) {
  try {
    const { prisma } = await import('../config/prisma.js');

    const existing = await prisma.newsItem.findUnique({
      where: { id: newsItemId },
      select: { sourcePublishedAt: true },
    });

    const result = await parseArticle(url);

    if (!result.success) {
      const patch = {
        body: `[Не удалось загрузить полный текст: ${result.error}]`,
      };
      if (result.sourcePublishedAt && !existing?.sourcePublishedAt) {
        patch.sourcePublishedAt = result.sourcePublishedAt;
      }
      await prisma.newsItem.update({
        where: { id: newsItemId },
        data: patch,
      });
      return { success: false, error: result.error };
    }

    const data = {
      body: result.content,
      title: result.title || undefined,
    };
    if (result.sourcePublishedAt && !existing?.sourcePublishedAt) {
      data.sourcePublishedAt = result.sourcePublishedAt;
    }

    await prisma.newsItem.update({
      where: { id: newsItemId },
      data,
    });

    try {
      const { maybeMergeNewsItem } = await import('./newsMerge.js');
      await maybeMergeNewsItem(newsItemId);
    } catch (mergeErr) {
      console.warn('newsMerge after enrich:', mergeErr.message);
    }

    return { success: true, content: result.content };
  } catch (error) {
    console.error(`Failed to enrich news item ${newsItemId}:`, error.message);
    return { success: false, error: error.message };
  }
}

export { DOMAIN_SELECTORS };

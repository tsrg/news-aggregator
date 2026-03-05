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
 * Парсит статью по URL
 * @param {string} url - URL статьи
 * @returns {Promise<{title: string|null, content: string|null, success: boolean, error?: string}>}
 */
export async function parseArticle(url) {
  try {
    if (!url) {
      return { success: false, error: 'URL is required', title: null, content: null };
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

    content = content ? cleanText(content) : null;

    return {
      success: true,
      title,
      content,
      domain,
    };

  } catch (error) {
    console.error(`Failed to parse article ${url}:`, error.message);
    return {
      success: false,
      error: error.message,
      title: null,
      content: null,
    };
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
    
    const result = await parseArticle(url);
    
    if (!result.success) {
      await prisma.newsItem.update({
        where: { id: newsItemId },
        data: {
          body: `[Не удалось загрузить полный текст: ${result.error}]`,
        },
      });
      return { success: false, error: result.error };
    }

    await prisma.newsItem.update({
      where: { id: newsItemId },
      data: {
        body: result.content,
        // Обновляем заголовок только если текущий пустой или очень короткий
        title: result.title || undefined,
      },
    });

    return { success: true, content: result.content };
  } catch (error) {
    console.error(`Failed to enrich news item ${newsItemId}:`, error.message);
    return { success: false, error: error.message };
  }
}

export { DOMAIN_SELECTORS };

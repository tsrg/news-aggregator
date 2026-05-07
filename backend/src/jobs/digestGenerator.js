import { prisma } from '../config/prisma.js';
import { getSettings } from '../services/settings.js';
import { generateDailyDigestArticle, generatePodcastMaterials } from '../services/ai.js';

const DIGEST_SETTINGS_KEY = 'digest_config';

/**
 * Возвращает настройки дайджеста из БД с fallback на дефолты.
 */
async function getDigestSettings() {
  const db = await getSettings(DIGEST_SETTINGS_KEY);
  return {
    enabled: db?.enabled !== false,
    minNewsCount: db?.minNewsCount ?? 3,
    lookbackHours: db?.lookbackHours ?? 24,
    includeSections: Array.isArray(db?.includeSections) ? db.includeSections : [],
    excludeSections: Array.isArray(db?.excludeSections) ? db.excludeSections : [],
    podcastHostAName: db?.podcastHostAName || 'Алексей',
    podcastHostBName: db?.podcastHostBName || 'Марина',
    podcastTargetMinutes: db?.podcastTargetMinutes ?? 7,
    podcastLanguage: db?.podcastLanguage || 'ru',
  };
}

/**
 * Форматирует дату как "15 апреля 2026"
 */
function formatDateLabel(date) {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });
}

/**
 * Возвращает начало дня (00:00:00) для заданной даты в московском времени.
 * Используем UTC+3 смещение.
 */
function getDayBounds(targetDate) {
  // Нормализуем к началу дня по UTC
  const d = new Date(targetDate);
  d.setUTCHours(0, 0, 0, 0);
  const from = new Date(d.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(d);
  return { from, to };
}

/**
 * Основная функция генерации ежедневного дайджеста.
 * @param {Date|string|null} targetDate — дата дайджеста (default: сегодня)
 * @param {{ force?: boolean }} opts — force=true пересоздаёт существующий
 */
export async function generateDailyDigest(targetDate = null, opts = {}) {
  const settings = await getDigestSettings();

  if (!settings.enabled && !opts.force) {
    console.log('[Digest] Генерация отключена в настройках, пропускаем.');
    return { skipped: true, reason: 'disabled' };
  }

  // Определяем дату дайджеста
  const now = new Date();
  const digestDate = targetDate ? new Date(targetDate) : now;
  // Нормализуем до начала дня UTC (используется как уникальный ключ)
  const digestDateKey = new Date(digestDate);
  digestDateKey.setUTCHours(0, 0, 0, 0);

  const dateLabel = formatDateLabel(digestDate);
  console.log(`[Digest] Запуск генерации дайджеста за ${dateLabel}`);

  // Проверяем, не существует ли уже готовый дайджест
  const existing = await prisma.dailyDigest.findUnique({
    where: { date: digestDateKey },
  });

  if (existing?.status === 'READY' && !opts.force) {
    console.log(`[Digest] Дайджест за ${dateLabel} уже готов (id=${existing.id}), пропускаем.`);
    return { skipped: true, reason: 'already_exists', digestId: existing.id };
  }

  // Период выборки новостей
  const { from, to } = getDayBounds(digestDateKey);
  const lookbackMs = settings.lookbackHours * 60 * 60 * 1000;
  const actualFrom = new Date(to.getTime() - lookbackMs);

  console.log(`[Digest] Период новостей: ${actualFrom.toISOString()} — ${to.toISOString()}`);

  // Строим фильтр по рубрикам
  const sectionFilter = {};
  if (settings.includeSections.length > 0) {
    sectionFilter.sectionId = { in: settings.includeSections };
  }
  if (settings.excludeSections.length > 0) {
    sectionFilter.sectionId = {
      ...(sectionFilter.sectionId || {}),
      notIn: settings.excludeSections,
    };
  }

  // Загружаем опубликованные новости за период
  const newsItems = await prisma.newsItem.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { gte: actualFrom, lt: to },
      mergedIntoId: null, // не включаем поглощённые
      ...sectionFilter,
    },
    include: { section: true },
    orderBy: { publishedAt: 'asc' },
  });

  console.log(`[Digest] Найдено новостей: ${newsItems.length}`);

  if (newsItems.length < settings.minNewsCount) {
    console.warn(`[Digest] Новостей меньше минимума (${newsItems.length} < ${settings.minNewsCount}), отменяем.`);
    // Сохраняем запись с ошибкой только если было явно запущено вручную
    if (opts.force) {
      await upsertDigest(digestDateKey, existing?.id, {
        status: 'FAILED',
        newsCount: newsItems.length,
        errorMessage: `Недостаточно новостей: ${newsItems.length} (минимум ${settings.minNewsCount})`,
      });
    }
    return { skipped: true, reason: 'not_enough_news', count: newsItems.length };
  }

  // Создаём/обновляем запись со статусом GENERATING
  const digest = await upsertDigest(digestDateKey, existing?.id, {
    status: 'GENERATING',
    newsItemIds: newsItems.map((n) => n.id),
    newsCount: newsItems.length,
    sections: buildSectionsIndex(newsItems),
    errorMessage: null,
  });

  try {
    // Обогащаем новости данными рубрики
    const enrichedItems = newsItems.map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary || '',
      body: n.body || '',
      sectionTitle: n.section?.title || 'Без рубрики',
      publishedAt: n.publishedAt,
    }));

    // Шаг 1: генерируем статью-дайджест
    console.log('[Digest] Генерация статьи...');
    const aiSettings = await import('../services/settings.js').then((m) => m.getSettings('ai_config'));
    const aiProvider = aiSettings?.aiProvider || 'openai';

    const article = await generateDailyDigestArticle(enrichedItems, dateLabel);
    console.log(`[Digest] Статья готова: "${article.title}"`);

    // Шаг 2: генерируем материалы для подкаста
    console.log('[Digest] Генерация материалов для подкаста...');
    const podcast = await generatePodcastMaterials(article, enrichedItems, {
      hostAName: settings.podcastHostAName,
      hostBName: settings.podcastHostBName,
      targetMinutes: settings.podcastTargetMinutes,
      language: settings.podcastLanguage,
    });
    console.log(`[Digest] Подкаст готов: ${podcast.script.length} реплик, ~${Math.round(podcast.totalDuration / 60)} мин`);

    // Сохраняем всё в БД
    const result = await upsertDigest(digestDateKey, digest.id, {
      status: 'READY',
      articleTitle: article.title,
      articleBody: article.body,
      articleSummary: article.summary,
      podcastPrompt: podcast.podcastPrompt,
      podcastScript: podcast.script,
      podcastTopics: podcast.topics,
      podcastDuration: podcast.totalDuration,
      podcastVoiceStyle: podcast.voiceStyle,
      podcastSoundscapePrompt: podcast.soundscapePrompt,
      aiProvider,
      generatedAt: new Date(),
      errorMessage: null,
    });

    // WebSocket-уведомление редакции
    try {
      const { broadcastDigestReady } = await import('../ws.js');
      if (typeof broadcastDigestReady === 'function') {
        broadcastDigestReady({ digestId: result.id, date: digestDateKey, title: article.title });
      }
    } catch (e) {
      // ws.js может не экспортировать эту функцию — не критично
    }

    console.log(`[Digest] Готово! id=${result.id}`);
    return { success: true, digestId: result.id, title: article.title, newsCount: newsItems.length };
  } catch (err) {
    console.error('[Digest] Ошибка генерации:', err.message);
    await upsertDigest(digestDateKey, digest.id, {
      status: 'FAILED',
      errorMessage: err.message || 'Неизвестная ошибка',
    });
    throw err;
  }
}

/**
 * Создаёт или обновляет запись DailyDigest.
 */
async function upsertDigest(dateKey, existingId, data) {
  if (existingId) {
    return prisma.dailyDigest.update({ where: { id: existingId }, data });
  }
  return prisma.dailyDigest.upsert({
    where: { date: dateKey },
    create: { date: dateKey, ...data },
    update: data,
  });
}

/**
 * Строит индекс группировки новостей по рубрикам для хранения в digest.sections.
 */
function buildSectionsIndex(newsItems) {
  const map = new Map();
  for (const n of newsItems) {
    const key = n.sectionId || '__none__';
    if (!map.has(key)) {
      map.set(key, {
        sectionId: n.sectionId || null,
        sectionTitle: n.section?.title || 'Без рубрики',
        items: [],
      });
    }
    map.get(key).items.push({ id: n.id, title: n.title });
  }
  return Array.from(map.values());
}

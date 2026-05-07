import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { getDigestQueue } from '../../jobs/queue.js';
import { generateDailyDigest } from '../../jobs/digestGenerator.js';

const router = Router();

// Все admin-маршруты требуют авторизации
router.use(requireAuth);

/**
 * GET /api/admin/digest
 * Список дайджестов с пагинацией
 */
router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [items, total] = await Promise.all([
      prisma.dailyDigest.findMany({
        skip,
        take,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          status: true,
          newsCount: true,
          articleTitle: true,
          articleSummary: true,
          podcastDuration: true,
          aiProvider: true,
          generatedAt: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
      prisma.dailyDigest.count(),
    ]);

    res.json({ items, total, page: parseInt(page, 10), limit: take });
  } catch (err) {
    console.error('[Digest API] GET /:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/digest/:date
 * Дайджест за конкретную дату (формат YYYY-MM-DD)
 */
router.get('/:date', async (req, res) => {
  try {
    const date = parseDateParam(req.params.date);
    if (!date) return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });

    const digest = await prisma.dailyDigest.findUnique({ where: { date } });
    if (!digest) return res.status(404).json({ error: 'Дайджест не найден' });

    res.json(digest);
  } catch (err) {
    console.error('[Digest API] GET /:date:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/digest/generate
 * Ручной запуск генерации дайджеста
 * Body: { date?: "YYYY-MM-DD", async?: boolean }
 */
router.post('/generate', async (req, res) => {
  try {
    const { date, async: isAsync = true } = req.body || {};
    const targetDate = date ? parseDateParam(date) : null;
    if (date && !targetDate) return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });

    if (isAsync) {
      // Ставим в очередь
      const dq = getDigestQueue();
      if (!dq) {
        return res.status(503).json({ error: 'Очередь задач недоступна (Redis не подключён)' });
      }
      const job = await dq.add({ targetDate: targetDate ? targetDate.toISOString() : null, force: true });
      return res.json({ queued: true, jobId: job.id });
    }

    // Синхронный запуск (для отладки)
    const result = await generateDailyDigest(targetDate, { force: true });
    res.json(result);
  } catch (err) {
    console.error('[Digest API] POST /generate:', err.message);
    res.status(500).json({ error: err.message || 'Ошибка генерации дайджеста' });
  }
});

/**
 * POST /api/admin/digest/:date/regenerate
 * Перегенерация дайджеста (статья, подкаст или оба)
 * Body: { parts?: "article"|"podcast"|"all" }
 */
router.post('/:date/regenerate', async (req, res) => {
  try {
    const date = parseDateParam(req.params.date);
    if (!date) return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });

    const { parts = 'all', async: isAsync = true } = req.body || {};

    if (isAsync) {
      const dq = getDigestQueue();
      if (!dq) return res.status(503).json({ error: 'Очередь задач недоступна' });
      const job = await dq.add({ targetDate: date.toISOString(), force: true, parts });
      return res.json({ queued: true, jobId: job.id });
    }

    const result = await generateDailyDigest(date, { force: true, parts });
    res.json(result);
  } catch (err) {
    console.error('[Digest API] POST /:date/regenerate:', err.message);
    res.status(500).json({ error: err.message || 'Ошибка перегенерации' });
  }
});

/**
 * GET /api/admin/digest/:date/export
 * Экспорт дайджеста
 * Query: format=json|markdown|text
 */
router.get('/:date/export', async (req, res) => {
  try {
    const date = parseDateParam(req.params.date);
    if (!date) return res.status(400).json({ error: 'Неверный формат даты' });

    const digest = await prisma.dailyDigest.findUnique({ where: { date } });
    if (!digest) return res.status(404).json({ error: 'Дайджест не найден' });
    if (digest.status !== 'READY') return res.status(409).json({ error: 'Дайджест ещё не готов' });

    const { format = 'json' } = req.query;

    if (format === 'json') {
      return res.json(digest);
    }

    if (format === 'markdown') {
      const md = buildMarkdownExport(digest);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="digest-${req.params.date}.md"`);
      return res.send(md);
    }

    if (format === 'text') {
      const txt = buildTextExport(digest);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="digest-${req.params.date}.txt"`);
      return res.send(txt);
    }

    res.status(400).json({ error: 'Неизвестный формат. Используйте: json, markdown, text' });
  } catch (err) {
    console.error('[Digest API] GET /:date/export:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/digest/:date
 * Удаление дайджеста
 */
router.delete('/:date', async (req, res) => {
  try {
    const date = parseDateParam(req.params.date);
    if (!date) return res.status(400).json({ error: 'Неверный формат даты' });

    const digest = await prisma.dailyDigest.findUnique({ where: { date } });
    if (!digest) return res.status(404).json({ error: 'Дайджест не найден' });

    await prisma.dailyDigest.delete({ where: { date } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Digest API] DELETE /:date:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Public endpoint ───────────────────────────────────────────────────────────

/**
 * GET /api/digest/today
 * Публичный эндпоинт: текущий дайджест (только если статус READY)
 */
export const digestPublicRouter = Router();

const PUBLIC_DIGEST_SELECT = {
  id: true,
  date: true,
  status: true,
  articleTitle: true,
  articleBody: true,
  articleSummary: true,
  newsCount: true,
  sections: true,
  podcastDuration: true,
  podcastPrompt: true,
  podcastScript: true,
  podcastTopics: true,
  podcastVoiceStyle: true,
  podcastSoundscapePrompt: true,
  generatedAt: true,
};

digestPublicRouter.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const digest = await prisma.dailyDigest.findUnique({
      where: { date: today },
      select: PUBLIC_DIGEST_SELECT,
    });

    if (!digest || digest.status !== 'READY') {
      return res.status(404).json({ error: 'Дайджест за сегодня ещё не готов' });
    }
    res.json(digest);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

digestPublicRouter.get('/date/:date', async (req, res) => {
  try {
    const date = parseDateParam(req.params.date);
    if (!date) return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });

    const digest = await prisma.dailyDigest.findUnique({
      where: { date },
      select: PUBLIC_DIGEST_SELECT,
    });

    if (!digest || digest.status !== 'READY') {
      return res.status(404).json({ error: 'Дайджест за эту дату не найден или ещё не готов' });
    }
    res.json(digest);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

digestPublicRouter.get('/list', async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = Math.min(parseInt(limit, 10), 50);

    const [items, total] = await Promise.all([
      prisma.dailyDigest.findMany({
        where: { status: 'READY' },
        skip,
        take,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          status: true,
          newsCount: true,
          articleTitle: true,
          articleSummary: true,
          podcastDuration: true,
          generatedAt: true,
        },
      }),
      prisma.dailyDigest.count({ where: { status: 'READY' } }),
    ]);

    res.json({ items, total, page: parseInt(page, 10), limit: take });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateParam(str) {
  if (!str || typeof str !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return null;
  return d;
}

function buildMarkdownExport(digest) {
  const lines = [`# ${digest.articleTitle}`, '', `> ${digest.articleSummary || ''}`, ''];

  // Статья (убираем HTML-теги)
  const articleText = (digest.articleBody || '').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  lines.push(articleText, '', '---', '', '## Материалы для подкаста', '');
  lines.push(`**Стиль голоса:** ${digest.podcastVoiceStyle || '—'}`, '');
  lines.push('### Промт для TTS', '', '```', digest.podcastPrompt || '', '```', '');

  if (Array.isArray(digest.podcastScript) && digest.podcastScript.length > 0) {
    lines.push('### Сценарий', '');
    for (const line of digest.podcastScript) {
      lines.push(`**${line.speaker === 'A' ? 'Ведущий А' : 'Ведущий Б'}:** ${line.text}`, '');
    }
  }

  if (Array.isArray(digest.podcastTopics) && digest.podcastTopics.length > 0) {
    lines.push('### Темы', '');
    for (const topic of digest.podcastTopics) {
      lines.push(`#### ${topic.title}`);
      for (const point of topic.talkingPoints || []) {
        lines.push(`- ${point}`);
      }
      lines.push('');
    }
  }

  lines.push('### Промт для фоновой музыки', '', digest.podcastSoundscapePrompt || '—');
  return lines.join('\n');
}

function buildTextExport(digest) {
  const lines = [
    `ДАЙДЖЕСТ: ${digest.articleTitle}`,
    '='.repeat(60),
    '',
    digest.articleSummary || '',
    '',
    '--- СТАТЬЯ ---',
    '',
    (digest.articleBody || '').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim(),
    '',
    '--- ПОДКАСТ: ПРОМТ ДЛЯ TTS ---',
    '',
    digest.podcastPrompt || '',
    '',
    '--- ПОДКАСТ: СЦЕНАРИЙ ---',
    '',
  ];

  if (Array.isArray(digest.podcastScript)) {
    for (const line of digest.podcastScript) {
      lines.push(`[${line.speaker === 'A' ? 'ВЕДУЩИЙ А' : 'ВЕДУЩИЙ Б'}] ${line.text}`);
      lines.push('');
    }
  }

  lines.push('--- ПОДКАСТ: ФОНОВАЯ МУЗЫКА ---', '', digest.podcastSoundscapePrompt || '');
  return lines.join('\n');
}

export default router;

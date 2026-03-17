import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { factCheckNews, aiEdit } from '../../services/ai.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('news'));

router.post('/ai/edit', async (req, res) => {
  try {
    const { newsId, text, field = 'body', action } = req.body;
    if (!action || !text) return res.status(400).json({ error: 'action and text required' });
    const allowed = ['improve', 'shorten', 'expand', 'generate-title', 'generate-summary'];
    if (!allowed.includes(action)) return res.status(400).json({ error: 'invalid action' });
    const result = await aiEdit(text, action, field);
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'AI error' });
  }
});

router.post('/:id/fact-check', async (req, res) => {
  try {
    const item = await prisma.newsItem.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, summary: true, body: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    const result = await factCheckNews(item.title, item.summary, item.body);
    const { config } = await import('../../config/index.js');
    const provider = config.ai?.provider || 'openai';
    await prisma.newsItemFactCheck.create({
      data: {
        newsItemId: item.id,
        provider,
        rawResponse: result,
        summary: result.summary?.slice(0, 2000),
      },
    }).catch(() => {});
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'AI error' });
  }
});

export default router;

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { factCheckNews, aiEdit, generateCoverImagePreview } from '../../services/ai.js';
import { resolveStorageProvider, uploadFileBySettings } from '../../services/storage.js';
import { rewriteStorageUrlForBrowser } from '../../services/s3.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('news'));

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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

router.post('/ai/generate-cover', async (req, res) => {
  try {
    const { title, summary, body } = req.body || {};
    const result = await generateCoverImagePreview({
      title: typeof title === 'string' ? title : '',
      summary: typeof summary === 'string' ? summary : '',
      body: typeof body === 'string' ? body : '',
    });
    return res.json(result);
  } catch (e) {
    console.error(e);
    const msg = e.message || 'AI error';
    const status = msg.includes('доступна при провайдере') || msg.includes('Недостаточно текста') ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

router.post('/:id/cover', coverUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const existing = await prisma.newsItem.findUnique({
      where: { id: req.params.id },
      include: { section: true, source: true },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const provider = await resolveStorageProvider();
    let url;

    if (provider === 'minio' || provider === 'cdn') {
      url = await uploadFileBySettings(req.file);
    } else {
      await mkdir('uploads', { recursive: true });
      const ext = path.extname(req.file.originalname) || '.png';
      const filename = `${randomUUID()}${ext}`;
      await writeFile(path.join('uploads', filename), req.file.buffer);
      url = `/uploads/${filename}`;
    }

    const publicUrl = rewriteStorageUrlForBrowser(url);

    const item = await prisma.newsItem.update({
      where: { id: req.params.id },
      data: { imageUrl: publicUrl },
      include: { section: true, source: true },
    });

    if (item.status === 'PUBLISHED') {
      try {
        const { broadcastNewsUpdated } = await import('../../ws.js');
        broadcastNewsUpdated(item);
      } catch (e) {
        console.warn('WebSocket broadcast:', e.message);
      }
    }

    return res.json({ url: publicUrl });
  } catch (err) {
    console.error('Cover upload failed:', err.message);
    return res.status(500).json({ error: err.message || 'Upload failed' });
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

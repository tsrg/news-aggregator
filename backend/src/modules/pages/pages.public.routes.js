import { Router } from 'express';
import { prisma } from '../../config/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pages = await prisma.page.findMany({
      where: { isVisible: true },
      orderBy: { order: 'asc' },
      select: { slug: true, title: true, order: true },
    });
    return res.json(pages);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const page = await prisma.page.findFirst({
      where: { slug: req.params.slug, isVisible: true },
    });
    if (!page) return res.status(404).json({ error: 'Not found' });
    return res.json(page);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

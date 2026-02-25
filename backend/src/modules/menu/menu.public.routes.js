import { Router } from 'express';
import { prisma } from '../../config/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, key: true, name: true },
    });
    return res.json(menus);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { key: req.params.key },
      include: {
        items: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: {
            children: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!menu) return res.status(404).json({ error: 'Not found' });
    return res.json(menu);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

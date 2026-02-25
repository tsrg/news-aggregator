import { Router } from 'express';
import { prisma } from '../../config/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const sections = await prisma.section.findMany({
      where: { isVisible: true },
      orderBy: { order: 'asc' },
    });
    return res.json(sections);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

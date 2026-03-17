import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('roles'));

router.get('/', async (req, res) => {
  try {
    const list = await prisma.permission.findMany({ orderBy: { code: 'asc' } });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

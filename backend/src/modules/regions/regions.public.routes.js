import { Router } from 'express';
import { getRegionsSettings } from '../../services/settings.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const settings = await getRegionsSettings();
    return res.json(settings);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


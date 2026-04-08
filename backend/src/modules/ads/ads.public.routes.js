import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { getAdMarkingDefaults } from '../../services/settings.js';
import { isCreativeActiveNow, resolveCreativeMarking, serializePublicCreative } from '../../services/ads.js';
import { sendPrismaClientError } from '../../utils/prismaClientError.js';

const router = Router();

router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const [defaults, placements] = await Promise.all([
      getAdMarkingDefaults(),
      prisma.adPlacement.findMany({
        include: {
          creatives: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
    ]);

    const markingDefaults = {
      advertiserName: defaults.advertiserName || '',
      advertiserInn: defaults.advertiserInn || '',
      advertiserOgrn: defaults.advertiserOgrn || '',
      distributorNote: defaults.distributorNote || '',
      erid: '',
    };

    const byPlacement = {};
    for (const p of placements) {
      const list = [];
      for (const c of p.creatives) {
        if (!isCreativeActiveNow(now, c)) continue;
        const marking = resolveCreativeMarking(markingDefaults, c);
        list.push(serializePublicCreative(c, marking));
      }
      byPlacement[p.code] = list;
    }

    return res.json({
      markingDefaults,
      byPlacement,
    });
  } catch (e) {
    return sendPrismaClientError(res, e, 'ads/active GET');
  }
});

export default router;

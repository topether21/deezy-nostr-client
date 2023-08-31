import { clearAllLists, fetchTopMarketplaceItems } from './cache';
import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

router.get('/api/v1/marketplace', async (_req: Request, res: Response) => {
  try {
    const marketplace = await fetchTopMarketplaceItems('sorted_by_value_all', 100);
    res.send({
      status: 'ok',
      marketplace,
    });
  } catch (e) {
    console.error('[/api/v1/marketplace][error]', e);
    res.sendStatus(500);
  }
});

router.get('/api/v1/marketplace/clean', async (_req: Request, res: Response) => {
  try {
    const marketplace = await clearAllLists();
    res.send({
      status: 'ok',
      marketplace,
    });
  } catch (e) {
    console.error('[/api/v1/marketplace/clean][error]', e);
    res.sendStatus(500);
  }
});

export default router;

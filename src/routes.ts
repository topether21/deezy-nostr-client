import { MIN_NON_TEXT_ITEMS, clearAllLists, fetchTopMarketplaceItems } from './cache';
import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

router.get('/api/v1/marketplace', async (req: Request, res: Response) => {
  try {
    // Get query parameters from request
    const size = req.query.size ? parseInt(req.query.size as string, 100) : MIN_NON_TEXT_ITEMS;
    const filter_by = (req.query.filter_by as string) || 'sorted_by_created_at_all';

    if (isNaN(size)) {
      return res.status(400).send({
        status: 'error',
        message: 'Invalid size parameter',
      });
    }

    // Fetch the items from the marketplace using the query parameters
    const marketplace = await fetchTopMarketplaceItems(filter_by, size);

    // Send the response
    res.send({
      status: 'ok',
      query: {
        size,
        filter_by,
      },
      size: marketplace.length,
      maxQueueSize: MIN_NON_TEXT_ITEMS,
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

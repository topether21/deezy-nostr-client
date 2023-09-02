import { ValidKeys, ValidOrders } from './types';
import { clearAllLists, fetchTopAuctionItems, fetchTopMarketplaceItems, keys as validKeys, validOrders } from './cache';
import express, { Router, Request, Response } from 'express';
import { MIN_NON_TEXT_ITEMS } from './config';

const router: Router = express.Router();

router.get('/api/v1/marketplace', async (req: Request, res: Response) => {
  try {
    const size = req.query.size ? parseInt(req.query.size as string, 10) : MIN_NON_TEXT_ITEMS;
    const filter_by = (req.query.filter_by as ValidKeys) || 'sorted_by_created_at_all';
    const order = (req.query.order as ValidOrders) || 'DESC';

    if (isNaN(size) || !validOrders.includes(order) || !validKeys.includes(filter_by)) {
      return res.status(400).send({
        status: 'error',
        message: 'Invalid parameters',
      });
    }

    const marketplace = await fetchTopMarketplaceItems(filter_by, order, size);

    res.send({
      status: 'ok',
      query: {
        size,
        filter_by,
        order,
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

router.get('/api/v1/auctions', async (_req: Request, res: Response) => {
  try {
    const auctions = await fetchTopAuctionItems();
    res.send({
      status: 'ok',
      auctions,
    });
  } catch (e) {
    console.error('[/api/v1/auctions][error]', e);
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

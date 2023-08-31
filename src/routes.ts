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
    const marketplace = (await fetchTopMarketplaceItems(filter_by, size)).reverse();

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

router.get('/events', async (_req, res) => {
  console.log('Client connected');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const intervalId = setInterval(() => {
    const date = new Date().toLocaleString();
    console.log('Sending date:', date);
    res.write(`data: ${date}\n\n`);
  }, 1000);

  res.on('close', () => {
    console.log('Client closed connection');
    clearInterval(intervalId);
    res.end();
  });
});

// Route for the SSE
router.get('/top-10-sales', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log('New client connected');

    const top10Sales = (await fetchTopMarketplaceItems('sorted_by_created_at_all', MIN_NON_TEXT_ITEMS))
      .reverse()
      .slice(0, 10);

    // Push the initial set of top-10 sales
    res.write(`data: ${JSON.stringify(top10Sales)}\n\n`);

    // Push updates whenever the top-10 sales change.
    const interval = setInterval(async () => {
      try {
        const currentTop10Sales = (await fetchTopMarketplaceItems('sorted_by_created_at_all', MIN_NON_TEXT_ITEMS))
          .reverse()
          .slice(0, 10);
        res.write(`data: ${JSON.stringify(currentTop10Sales)}\n\n`);
      } catch (innerErr) {
        console.error('Failed to fetch or send top 10 sales:', innerErr);
      }
    }, 2000);

    // Close the connection when the client disconnects
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } catch (outerErr) {
    console.error('An error occurred while setting up SSE:', outerErr);
    res.status(500).send('An error occurred');
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

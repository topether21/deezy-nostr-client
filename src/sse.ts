import { MIN_NON_TEXT_ITEMS, fetchTopMarketplaceItems } from './cache';
import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

router.get('/events', (req: Request, res: Response) => {
  console.log('Client connected.');

  // Set necessary headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send a ping event every second
  const intervalId = setInterval(() => {
    console.log('Sending ping event', Math.random());
    res.write(`data: ${Math.random()}\n\n`);
  }, 1000);

  // Cleanup when the connection is closed
  req.on('close', () => {
    console.log('Client disconnected.');
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

export default router;

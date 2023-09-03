import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express, { Router } from 'express';
import { nostrQueue } from './nostr';
import { auctionQueue } from './auctions';

const router: Router = express.Router();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const queues = [nostrQueue, auctionQueue].map((q) => new BullMQAdapter(q, { readOnlyMode: false }));

createBullBoard({
  queues,
  serverAdapter: serverAdapter,
  options: {
    uiConfig: {
      boardTitle: '',
      boardLogo: {
        path: 'https://deezy.place/images/logo/logo-white.svg',
      },
      favIcon: {
        default: 'https://deezy.place/images/logo/logo-white.svg',
        alternative: '',
      },
    },
  },
});

router.use('/', serverAdapter.getRouter());

export default router;

import { nostrPool } from './nostr-relay';
import { getAuctions } from './services/nosft';
import { nostrConfig, nostrQueue } from './queues/nostr';
import cron from 'node-cron';
import { clearAllLists, db, pub, sub, updateAuctions } from './cache';
import { MIN_NON_TEXT_ITEMS } from './config';
import { Auction } from 'types';

export const subscribeToOnSale = (limitSaleResults: number = 100) => {
  const orderSubscription = nostrPool.subscribeOrders({ limit: limitSaleResults }).subscribe(async (event) => {
    try {
      nostrQueue.add(nostrConfig.name, event);
    } catch (error) {
      console.error(error);
    }
  });

  return {
    cleanup: () => {
      try {
        orderSubscription.unsubscribe();
      } catch (err) {
        console.error(err);
      }
    },
  };
};

export const subscribeToOnAuctions = () => {
  const cronJob = async () => {
    try {
      const auctions = (await getAuctions()).filter((a) => a.status === 'RUNNING') as Auction[];
      await updateAuctions(auctions);
      console.log('Auctions:', auctions.length);
    } catch (error) {
      console.error('[error]', (error as Error).message);
    }
  };
  // create a cron job to fetch auctions every 15 seconds
  cron.schedule('*/15 * * * * *', cronJob);
  cronJob();
};

export const initCache = async () => {
  await Promise.all([pub.connect(), sub.connect(), db.connect()]);

  await clearAllLists();

  subscribeToOnSale(MIN_NON_TEXT_ITEMS);
  subscribeToOnAuctions();
};

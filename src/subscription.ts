import { nostrPool } from './nostr-relay';

import { nostrConfig, nostrQueue } from './queues/nostr';
import cron from 'node-cron';
import { clearAllLists, isQueueActive } from './cache';
import { MIN_NON_TEXT_ITEMS } from './config';

type Subscription = {
  cleanup: () => void;
};

let currentSubscriptions: Subscription[] = [];

export const subscribeToOnSale = (limitSaleResults: number = 100) => {
  console.log('------> [subscribeToOnSale]');
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

// export const subscribeToOnAuctions = () => {
//   const cronJob = async () => {
//     try {
//       const auctions = (await getAuctions()).filter((a) => a.status === 'RUNNING') as Auction[];
//       await updateAuctions(auctions);
//       console.log('Auctions:', auctions.length);
//     } catch (error) {
//       console.error('[error]', (error as Error).message);
//     }
//   };
//   // create a cron job to fetch auctions every 15 seconds
//   cron.schedule('*/15 * * * * *', cronJob);
//   cronJob();
// };

export const onSaleCron = async () => {
  const cronJob = async () => {
    try {
      const isActive = await isQueueActive();
      if (!isActive) {
        console.log('[Queue is not active], restart queue...');
        currentSubscriptions.forEach((sub) => sub.cleanup());
        const { cleanup: newCleanupFunc } = subscribeToOnSale(20);
        currentSubscriptions = [];
        currentSubscriptions.push({ cleanup: newCleanupFunc });
      } else {
        console.log('[Queue is active]...');
      }
    } catch (error) {
      console.error('[error]', (error as Error).message);
    }
  };
  cron.schedule('0 * * * * *', cronJob); // each minute
};

export const initCache = async () => {
  try {
    await clearAllLists();

    const { cleanup } = subscribeToOnSale(MIN_NON_TEXT_ITEMS);

    currentSubscriptions.push({ cleanup });

    await onSaleCron();
  } catch (error) {
    console.error(error);
  }
};

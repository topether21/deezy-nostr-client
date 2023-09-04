import { nostrPool } from './nostr-relay';

import { nostrConfig, nostrQueue } from './queues/nostr';
import cron from 'node-cron';
import { isQueueActive } from './cache';
import { MIN_NON_TEXT_ITEMS } from './config';
import { syncAuctions } from './queues/shared';

type Subscription = {
  cleanup: () => void;
};

let currentSubscriptions: Subscription[] = [];

export const subscribeToOnSale = (limitSaleResults: number = 100) => {
  console.log('------> [subscribeToOnSale]');
  const orderSubscription = nostrPool.subscribeOrders({ limit: limitSaleResults }).subscribe(async (event) => {
    try {
      nostrQueue.add(nostrConfig.name, event, {
        removeOnComplete: true,
        removeOnFail: true,
      });
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

const cleanupSubscriptions = () => {
  currentSubscriptions.forEach((sub) => sub.cleanup());
};

export const onSaleCron = async () => {
  const cronJob = async () => {
    try {
      const isActive = await isQueueActive();
      if (!isActive) {
        console.log('[Queue is not active], restart queue...');
        cleanupSubscriptions();
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
  cron.schedule('*/5 * * * *', cronJob); // each 5 minutes
};

export const initCache = async () => {
  try {
    cleanupSubscriptions();
    const { cleanup } = subscribeToOnSale(MIN_NON_TEXT_ITEMS);
    currentSubscriptions.push({ cleanup });
    await syncAuctions();
    await onSaleCron();
  } catch (error) {
    console.error(error);
  }
};

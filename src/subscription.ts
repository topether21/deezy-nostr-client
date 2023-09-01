import { nostrPool } from './nostr-relay';
import { nostrConfig, nostrQueue } from './queues/nostr';

export const subscribe = (maxOnSale: number = 100) => {
  const orderSubscription = nostrPool.subscribeOrders({ limit: maxOnSale }).subscribe(async (event) => {
    try {
      nostrQueue.add(nostrConfig.name, event, { jobId: event.id });
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

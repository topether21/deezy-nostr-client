import { Observable, Observer } from 'rxjs';
import { subscribeOrders as subscribeNosftOrders, unsubscribeOrders } from './services/nosft';

type SubscribeOrders = {
  limit: number;
};

interface NostrModule {
  subscriptionOrders: {
    unsub?: () => void;
  } | null;
  subscribeOrders: (params: SubscribeOrders) => Observable<any>;
  unsubscribeOrders: () => void;
}

const Nostr = function (): NostrModule {
  const nostrModule: NostrModule = {
    subscriptionOrders: null,
    subscribeOrders: ({ limit }: SubscribeOrders) =>
      new Observable((observer: Observer<any>) => {
        try {
          nostrModule.unsubscribeOrders();
          const orderEvent = (err: Error | null, event: any) => {
            if (err) {
              observer.error(err);
            } else {
              observer.next(event);
            }
          };

          nostrModule.subscriptionOrders = subscribeNosftOrders({
            callback: orderEvent,
            limit,
            filter: [],
          }) as { unsub?: () => void };
        } catch (error: any) {
          observer.error(error);
        }
      }),
    unsubscribeOrders: () => {
      if (nostrModule.subscriptionOrders) {
        unsubscribeOrders();
        if (nostrModule.subscriptionOrders.unsub) {
          nostrModule.subscriptionOrders.unsub();
        }
        nostrModule.subscriptionOrders = null;
      }
    },
  };
  return nostrModule;
};

const nostrPool = Nostr();
export { nostrPool };

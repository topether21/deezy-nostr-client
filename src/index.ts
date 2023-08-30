import { nostrPool } from './nostr-relay';

(async () => {
  console.log('Hello World!');
  nostrPool.subscribeOrders({ limit: 100 }).subscribe((event) => {
    console.log(event);
  });
})();

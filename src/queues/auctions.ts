import { config } from './../config';
import { connection } from './connection';
import { Job, Queue, Worker } from 'bullmq';
import { syncAuctions } from './shared';

export const auctionsConfig = {
  name: `${config.prefix}Auctions Events`,
};

export const auctionQueue = new Queue(auctionsConfig.name, {
  connection,
});

export const updateAuctionsWorker = new Worker(
  auctionQueue.name,
  async ({ data }: Job<any>) => {
    if (!data) return;

    await syncAuctions();

    return {
      status: 'ok',
      ...data,
    };
  },
  {
    concurrency: 1,
    connection,
  }
);

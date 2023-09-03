import { config } from './../config';
import { connection } from './connection';
import { Job, Queue, Worker } from 'bullmq';
import { getAuctions } from './../services/nosft';
import { Auction } from './../types';

import { updateAuctions } from './../cache';

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

    try {
      const auctions = (await getAuctions()).filter((a) => a.status === 'RUNNING') as Auction[];
      await updateAuctions(auctions);
      console.log('Auctions:', auctions.length);
    } catch (error) {
      console.error('[error]', (error as Error).message);
    }

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

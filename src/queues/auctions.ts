import { config } from './../config';
import { connection } from './connection';
import { Job, Queue, Worker } from 'bullmq';
import { syncAuctions } from './shared';
//@ts-ignore
import * as emoji from 'node-emoji';

export const auctionsConfig = {
  name: `${config.prefix}Auctions Events`,
};

export const auctionQueue = new Queue(auctionsConfig.name, {
  connection,
});

export const updateAuctionsWorker = new Worker(
  auctionsConfig.name,
  async ({ data }: Job) => {
    if (!data) return;

    console.log(`${emoji.get('unicorn')}----> [updateAuctionsWorker]`);

    await syncAuctions();

    console.log(`${emoji.get('unicorn')}----> [updateAuctionsWorker]`);

    return {
      status: 'ok',
    };
  },
  {
    concurrency: 1,
    connection,
  }
);

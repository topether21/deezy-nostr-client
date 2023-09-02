import { config } from './../config';
import { connection } from './connection';
import { getOrderInformation, isSpent } from './../services/nosft';
import { Job, Queue, Worker } from 'bullmq';

import { NosftEvent, RawNostrEvent } from './../types';
import { addOnSaleItem } from './../cache';
import { getInscriptionData } from './shared';

export const nostrConfig = {
  name: `${config.prefix}Nostr Events`,
};

export const nostrQueue = new Queue(nostrConfig.name, {
  connection,
});

export const buildInscription = async (event: RawNostrEvent): Promise<NosftEvent | undefined> => {
  const order = await getOrderInformation(event);
  const inscription: NosftEvent = await getInscriptionData(order);
  const isSpentUtxo = await isSpent(inscription);
  if (!isSpentUtxo.spent) {
    return inscription;
  }
};

export const nostrWorker = new Worker(
  nostrQueue.name,
  async ({ data, name, id }: Job<RawNostrEvent>) => {
    console.log(`[worker]-->`, name, id);
    const inscription = await buildInscription(data);

    if (!inscription) return;

    await addOnSaleItem(inscription);

    return {
      status: 'ok',
      ...inscription,
    };
  },
  {
    concurrency: config.maxThreads * 5,
    connection,
  }
);

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

// Queue for adding on sale item
export const addOnSaleQueue = new Queue(`${config.prefix}AddOnSale`, {
  connection,
});

export const addOnSaleWorker = new Worker(
  addOnSaleQueue.name,
  async ({ data }: Job<NosftEvent>) => {
    if (!data) return;

    await addOnSaleItem(data);

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

export const nostrWorker = new Worker(
  nostrQueue.name,
  async ({ data, name, id }: Job<RawNostrEvent>) => {
    console.log(`[worker]-->`, name, id);
    const inscription = await buildInscription(data);

    if (!inscription) return;

    await addOnSaleQueue.add(addOnSaleQueue.name, inscription);

    return {
      status: 'ok',
      ...inscription,
    };
  },
  {
    concurrency: 10,
    connection,
  }
);

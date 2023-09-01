import { config } from './../config';
import { connection } from './connection';
import { getOrderInformation, isSpent } from './../services/nosft';
import { Job, Queue, Worker } from 'bullmq';

import { getInscription } from './../services/nosft';
import { NosftEvent } from './../types';
import { addItem } from './../cache';

export const nostrConfig = {
  name: `${config.prefix}Nostr Events`,
};

export const nostrQueue = new Queue(nostrConfig.name, {
  connection,
});

const getInscriptionData = async (event: any) => {
  const { inscription } = await getInscription(event.inscriptionId);
  return {
    ...inscription,
    ...event,
  };
};

export const nostrWorker = new Worker(
  nostrQueue.name,
  async ({ data, name, id }: Job<any>) => {
    console.log(`[worker]-->`, name, id);
    const order = await getOrderInformation(data);
    const inscription: NosftEvent = await getInscriptionData(order);

    const isSpentUtxo = await isSpent(inscription);
    if (isSpentUtxo.spent) {
      console.log('utxo is spent', inscription);
      return {
        status: 'utxo is spent',
      };
    }

    await addItem(inscription);

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

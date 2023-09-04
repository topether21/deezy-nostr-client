import { config } from './../config';
import { connection } from './connection';
import { getOrderInformation, isSpent } from './../services/nosft';
import { Job, Queue, Worker } from 'bullmq';

import { NosftEvent, RawNostrEvent } from './../types';
import { addOnSaleItem } from './../cache';
import { getInscriptionData } from './shared';
import axios from 'axios';

export const nostrConfig = {
  name: `${config.prefix}Nostr Events`,
};

export const trackingConfig = {
  name: `${config.prefix}Tracking Events`,
};

export const nostrQueue = new Queue(nostrConfig.name, {
  connection,
});

export const trackingQueue = new Queue(trackingConfig.name, {
  connection,
});

const notifyTrackerService = async (event: RawNostrEvent) => {
  try {
    const inscriptionIdTag = event.tags.find((tag) => tag[0] === 'i');
    const inscriptionId = inscriptionIdTag ? inscriptionIdTag[1] : null;
    const url = `${config.trackingWebsite}/inscription/${inscriptionId}/refresh`;
    // console.log('Sending HTTP POST request to', url);
    const { status } = await axios.post(url);
    console.log('Tracking service notified -->', status);
  } catch (error) {
    console.error('Error sending HTTP POST request', (error as Error).message);
  }
};

export const buildInscription = async (event: RawNostrEvent): Promise<NosftEvent | undefined> => {
  const order = await getOrderInformation(event);
  const inscription: NosftEvent = await getInscriptionData(order);
  try {
    const isSpentUtxo = await isSpent(inscription);
    if (!isSpentUtxo.spent) {
      return inscription;
    }
  } catch (error) {
    console.error('Error on isSpent', error);
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

    // console.log('----> [Adding on sale item]...', data.output);
    await addOnSaleItem(data);
    // console.log('<<---- [Added on sale item]...', data.output);

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

export const trackingWorker = new Worker(
  trackingQueue.name,
  async ({ data }: Job<RawNostrEvent>) => {
    await notifyTrackerService(data);
    return {
      status: 'ok',
    };
  },
  {
    concurrency: 10,
    connection,
  }
);

export const nostrWorker = new Worker(
  nostrQueue.name,
  async ({ data }: Job<RawNostrEvent>) => {
    await trackingQueue.add(trackingWorker.name, data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    const inscription = await buildInscription(data);

    if (!inscription) return;

    // console.log('----> [Adding inscription to queue]...', inscription.output);

    await addOnSaleQueue.add(addOnSaleQueue.name, inscription, {
      removeOnComplete: true,
      removeOnFail: true,
    });

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

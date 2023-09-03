import { getInscription } from './../services/nosft';
import { getAuctions } from './../services/nosft';
import { Auction } from './../types';

import { updateAuctions } from './../cache';

export const getInscriptionData = async (event: any) => {
  const { inscription } = await getInscription(event.inscriptionId);
  return {
    ...inscription,
    ...event,
  };
};

export const syncAuctions = async () => {
  try {
    console.log('[syncAuctions]');
    const auctions = (await getAuctions()).filter((a) => a.status === 'RUNNING') as Auction[];
    console.log('Auctions:', auctions.length);
    await updateAuctions(auctions);
    return auctions;
  } catch (error) {
    console.error('[error][syncAuctions]', (error as Error).message);
  }
};

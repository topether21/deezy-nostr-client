import 'websocket-polyfill';
import { Nosft } from 'nosft-core';
import { RawNostrEvent } from './../types';
import { buildInscription } from './../queues/nostr';

const nosft = Nosft();

const { isSpent } = nosft.utxo;
const { getAuctions } = nosft.auction;

const { getOrderInformation } = nosft.openOrdex;
const { subscribePlainOrders: subscribeOrders, unsubscribeOrders } = nosft.nostr;
const { getInscription, takeLatestInscription, isTextInscription } = nosft.inscriptions;

export {
  subscribeOrders,
  unsubscribeOrders,
  isSpent,
  getInscription,
  takeLatestInscription,
  isTextInscription,
  getOrderInformation,
  getAuctions,
};

export const formatAuction = async (event: RawNostrEvent) => {
  return buildInscription(event);
};

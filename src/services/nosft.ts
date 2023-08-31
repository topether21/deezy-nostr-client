import 'websocket-polyfill';
import { Nosft } from 'nosft-core';

const nosft = Nosft();

const { isSpent } = nosft.utxo;
const { subscribeOrders, unsubscribeOrders } = nosft.nostr;
const { getInscription, takeLatestInscription, isTextInscription } = nosft.inscriptions;

export { subscribeOrders, unsubscribeOrders, isSpent, getInscription, takeLatestInscription, isTextInscription };

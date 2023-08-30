import 'websocket-polyfill';
import { Nosft } from 'nosft-core';

interface INosft {
  nostr: {
    subscribeOrders: Function;
    unsubscribeOrders: Function;
  };
}

const nosft: INosft = Nosft();

const { subscribeOrders, unsubscribeOrders } = nosft.nostr;

export { subscribeOrders, unsubscribeOrders };

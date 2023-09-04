type Tag = [string, string];

export type NosftEvent = {
  content_length: string;
  content_type: string;
  created: number;
  genesis_fee: string;
  genesis_height: string;
  id: string;
  num: string;
  owner: string;
  sats: string;
  output: string;
  offset: string;
  inscriptionId: string;
  vout: number;
  txid: string;
  value: number;
  content: string;
  created_at: number;
  kind: number;
  pubkey: string;
  sig: string;
  tags: Tag[];
};

export type ValidKeys = 'sorted_by_created_at_all';

export type ValidOrders = 'ASC' | 'DESC';

export interface RawNostrEvent {
  content: string;
  created_at: number;
  id: string;
  kind: number;
  pubkey: string;
  sig: string;
  tags: string[][];
}

export type Auction = {
  initialPrice: number;
  metadata: {
    nostr?: RawNostrEvent;
    scheduledTime: number;
    nostrEventId: string;
    price: number;
    signedPsbt: string;
    index: number;
    isLastEvent: boolean;
    id: string;
    endTime: number;
  }[];
  inscriptionId: string;
  secondsBetweenEachDecrease: number;
  status: string;
  decreaseAmount: number;
  btcAddress: string;
  currentPrice: number;
  startTime: number;
  scheduledISODate: string;
  output: string;
  id: string;
  reservePrice: number;
};

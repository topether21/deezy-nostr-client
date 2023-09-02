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

export type ValidKeys =
  | 'sorted_by_value_all'
  | 'sorted_by_value_no_text'
  | 'sorted_by_created_at_all'
  | 'sorted_by_created_at_no_text'
  | 'sorted_by_num_all'
  | 'sorted_by_num_no_text';

export type ValidOrders = 'ASC' | 'DESC';

export interface RawNostrEvent {
  sig: string;
  inscriptionId: string;
  kind: number;
  created_at: number;
  id: string;
  value: number;
  content: string;
  pubkey: string;
  tags: [string, string][];
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

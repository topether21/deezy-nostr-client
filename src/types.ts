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

// https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189
import { createClient } from 'redis';
import { formatAuction } from './services/nosft';
import { Auction, NosftEvent, RawNostrEvent, ValidKeys } from './types';
import { MIN_NON_TEXT_ITEMS } from './config';
import crypto from 'crypto';

const auth = process.env.REDIS_TYPE === 'internal' ? {} : { password: process.env.REDIS_PASSWORD };

const AUCTION_KEY = 'auctions';

const redisConfig = {
  ...auth,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '17549'),
  },
};

export const db = createClient(redisConfig);

const pub = db.duplicate();
const sub = db.duplicate();

export { pub, sub };

// Function to generate a hash of a list of auctions
const generateHash = (auctions: { score: number; value: string }[]) => {
  const auctionsString = JSON.stringify(auctions);
  return crypto.createHash('sha256').update(auctionsString).digest('hex');
};

// We can do a better job here, but for now, we just check if the hash is the same
// Adds a list of auctions to Redis, replacing the existing set
export const updateAuctions = async (auctions: Auction[]) => {
  const auctionsWithTimestamp: {
    score: number;
    value: string;
  }[] = [];

  let isAdded = false; // Flag for added auction

  for (const auction of auctions) {
    if (auction.status !== 'RUNNING') continue;

    let latestNostrEvent: RawNostrEvent | undefined;

    // Iterate through metadata array in reverse to find the latest 'nostr' event
    for (let i = auction.metadata.length - 1; i >= 0; i--) {
      if (auction.metadata[i].nostr) {
        latestNostrEvent = auction.metadata[i]?.nostr;

        break; // Stop iterating once we've found the latest nostr event
      }
    }

    // If there's no nostr event, skip adding this auction
    if (!latestNostrEvent) {
      continue;
    }

    try {
      const auctionEvent = await formatAuction(latestNostrEvent);

      auctionsWithTimestamp.push({
        score: latestNostrEvent.created_at,
        value: JSON.stringify(auctionEvent),
      });
    } catch (error) {
      console.error(error);
    }
  }

  // Generate a hash of the new list of auctions
  const newHash = generateHash(auctionsWithTimestamp);

  // Fetch the stored hash
  const storedHash = await db.get('auctions_hash');

  // If the hashes are the same, skip the update
  if (newHash === storedHash) {
    return;
  }

  // Delete existing auctions
  await db.del(AUCTION_KEY);

  // Add all auctions to Redis sorted set in one go
  if (auctionsWithTimestamp.length > 0) {
    await db.zAdd(AUCTION_KEY, auctionsWithTimestamp);
    isAdded = true;
  }

  // Update the stored hash
  await db.set('auctions_hash', newHash);

  if (isAdded) {
    pub.publish('update_sets_on_auction', 'add');
    console.log('Published [add][auction] event to update_sets_on_auction');
  }
};

export const addOnSaleItem = async (item: NosftEvent) => {
  const key = 'sorted_by_created_at_all';
  const score = item.created_at;

  let isAdded = false;
  let isRemoved = false;

  let retries = 5;
  while (retries > 0) {
    // Watch the hash key for changes
    await db.watch(key + '_hash');

    const existingItemTimestamp = await db.hGet(key + '_hash', item.output);

    if (existingItemTimestamp && parseInt(existingItemTimestamp) >= score) {
      // The existing item is newer or the same, so skip
      return;
    }

    const multi = db.multi();

    if (existingItemTimestamp) {
      // Remove the older item
      const existingItems = await db.zRangeByScore(key, existingItemTimestamp, existingItemTimestamp);
      multi.zRem(key, existingItems[0]).hDel(key + '_hash', item.output);
      isRemoved = true;
    }

    // Add the new item
    multi
      .zAdd(key, [
        {
          score: parseInt(score.toString()),
          value: JSON.stringify(item),
        },
      ])
      .hSet(key + '_hash', item.output, score.toString());

    const results = await multi.exec();

    if (results === null) {
      // Someone else modified the key, retry
      retries -= 1;
    } else {
      // Success, exit loop
      isAdded = true;
      break;
    }
  }

  // Publish events based on flags
  if (isAdded) {
    pub.publish('update_sets_on_sale', 'add');
    console.log('Published [add][onsale] event to update_sets');
  }

  if (isRemoved) {
    pub.publish('update_sets_on_sale', 'remove');
    console.log('Published [remove][onsale] event to update_sets');
  }
};

export const validOrders = ['ASC', 'DESC'];

export const keys = ['sorted_by_created_at_all', 'sorted_by_created_at_no_text'];

export const removeItem = async (item: NosftEvent) => {
  for (const key of keys) {
    await db.zRem(key, JSON.stringify(item));
    await db.hDel(key + '_hash', item.output);
  }

  const nonTextCount = await db.zCount('sorted_by_created_at_no_text', '-inf', '+inf');
  if (nonTextCount < MIN_NON_TEXT_ITEMS) {
    loadMoreItems();
  }
};

const loadMoreItems = () => {
  // Implement your logic here to add more non-text items
  // console.log('Fetching more non-text items...');
};

export const fetchTopMarketplaceItems = async (
  key: ValidKeys,
  order: 'ASC' | 'DESC' = 'DESC',
  limit?: number
): Promise<NosftEvent[]> => {
  let items: string[] = [];

  // Decide the limit for fetching, use -1 to fetch all
  const count = limit ? limit - 1 : -1;

  // Fetch items
  if (order === 'ASC') {
    items = await db.zRange(key, 0, count);
  } else {
    items = await db.zRange(key, 0, count, {
      REV: true,
    });
  }

  return items.map((item: string) => JSON.parse(item));
};

export const fetchTopAuctionItems = async (order: 'ASC' | 'DESC' = 'DESC', limit?: number): Promise<NosftEvent[]> => {
  let items: string[] = [];

  // Decide the limit for fetching, use -1 to fetch all
  const count = limit ? limit - 1 : -1;

  // Fetch items
  if (order === 'ASC') {
    items = await db.zRange(AUCTION_KEY, 0, count);
  } else {
    items = await db.zRange(AUCTION_KEY, 0, count, {
      REV: true,
    });
  }

  return items.map((item: string) => JSON.parse(item));
};

export const clearAllLists = async () => {
  await db.flushAll();
};

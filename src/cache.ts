import Redis from 'ioredis';
import Redlock from 'redlock';
import { formatAuction } from './services/nosft';
import { Auction, NosftEvent, RawNostrEvent, ValidKeys } from './types';
import { MAX_CAPACITY, MIN_NON_TEXT_ITEMS } from './config';
import crypto from 'crypto';

const auth = process.env.REDIS_TYPE === 'internal' ? {} : { password: process.env.REDIS_PASSWORD };

const AUCTION_KEY = 'auctions';

const redisConfig = {
  ...auth,
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '17549'),
};

export const db = new Redis(redisConfig);

const pub = db.duplicate();
const sub = db.duplicate();

const redlock = new Redlock([db as any, pub as any, sub as any], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200,
});

export { pub, sub };

// Function to generate a hash of a list of auctions
const generateHash = (auctions: (number | string)[]) => {
  const auctionsString = JSON.stringify(auctions);
  return crypto.createHash('sha256').update(auctionsString).digest('hex');
};

// We can do a better job here, but for now, we just check if the hash is the same
// Adds a list of auctions to Redis, replacing the existing set
export const updateAuctions = async (auctions: Auction[]) => {
  const auctionsWithTimestamp: (number | string)[] = [];

  let updated = false; // Flag for added auction

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

      auctionsWithTimestamp.push(...[latestNostrEvent.created_at, JSON.stringify(auctionEvent)]);
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
    await db.zadd(AUCTION_KEY, ...auctionsWithTimestamp);
    updated = true;
  }

  // Update the stored hash
  await db.set('auctions_hash', newHash);

  if (updated) {
    pub.publish('update_sets_on_auction', 'update');
    console.log('Published [add][auction] event to update_sets_on_auction');
  }
};

export const addItemsAux = async (item: NosftEvent) => {
  try {
    const key = 'sorted_by_created_at_all';
    const score = item.created_at;

    let isAdded = false; // Flag for added item
    let isRemoved = false; // Flag for removed item

    const existingItemTimestamp = await db.hget(key + '_hash', item.output);

    const multi = db.multi();

    if (existingItemTimestamp && parseInt(existingItemTimestamp) >= score) {
      // The existing item is newer or the same, so skip
      return;
    }

    if (existingItemTimestamp) {
      // Remove the older item
      const existingItems = await db.zrangebyscore(key, existingItemTimestamp, existingItemTimestamp);
      multi.zrem(key, existingItems[0]).hdel(key + '_hash', item.output);
      isRemoved = true;
    }

    // Add the new item
    multi
      .zadd(key, ...[parseInt(score.toString()), JSON.stringify(item)])
      .hset(key + '_hash', item.output, score.toString());

    await multi.exec();

    isAdded = true;

    // Check for max capacity and remove the oldest item if needed
    const setSize = await db.zcount(key, '-inf', '+inf');
    if (setSize > MAX_CAPACITY) {
      const oldestItems = await db.zrange(key, 0, 0);
      if (oldestItems.length > 0) {
        await db.multi().zrem(key, oldestItems[0]).exec();
        isRemoved = true;
      }
    }

    // Publish events based on flags
    if (isAdded) {
      pub.publish('update_sets_on_sale', 'add');
      await updateLastPushTimestamp();
      console.log('Published [add][onsale] event to update_sets');
    }

    if (isRemoved) {
      pub.publish('update_sets_on_sale', 'remove');
      await updateLastPushTimestamp();
      console.log('Published [remove][onsale] event to update_sets');
    }
  } catch (err) {
    console.error(err);
    throw new Error('Error adding item to cache');
  }
};

export const addOnSaleItem = async (item: NosftEvent) => {
  const lockKey = 'addOnSaleItemLock';

  let lock = await redlock.acquire([lockKey], 5000);
  try {
    addItemsAux(item);
  } catch (err) {
    console.log('Could not acquire lock');
  } finally {
    // Release the lock.
    await lock.unlock();
  }
};

export const validOrders = ['ASC', 'DESC'];

export const keys = ['sorted_by_created_at_all', 'sorted_by_created_at_no_text'];

export const removeItem = async (item: NosftEvent) => {
  for (const key of keys) {
    await db.zrem(key, JSON.stringify(item));
    await db.hdel(key + '_hash', item.output);
  }

  const nonTextCount = await db.zcount('sorted_by_created_at_no_text', '-inf', '+inf');
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
    items = await db.zrange(key, 0, count);
  } else {
    items = await db.zrevrange(key, 0, count);
  }

  return items.map((item: string) => JSON.parse(item));
};

// Update this timestamp whenever the producer pushes something into the sorted set
export async function updateLastPushTimestamp() {
  const currentTimestamp = Date.now();
  await db.set('last_push_timestamp', currentTimestamp.toString());
}

// Check the timestamp to see if anything has been pushed in the last minute
export async function isQueueActive() {
  const lastPushTimestamp = await db.get('last_push_timestamp');
  if (lastPushTimestamp) {
    const currentTime = Date.now();
    const timeDifference = currentTime - Number(lastPushTimestamp);
    if (timeDifference > 60000) {
      // 60000ms = 1 minute
      console.log('No activity from the producer in the last minute.');
      return false;
    }
    return true;
  }
  return false;
}

export const fetchTopAuctionItems = async (order: 'ASC' | 'DESC' = 'DESC', limit?: number): Promise<NosftEvent[]> => {
  let items: string[] = [];

  // Decide the limit for fetching, use -1 to fetch all
  const count = limit ? limit - 1 : -1;

  // Fetch items
  if (order === 'ASC') {
    items = await db.zrange(AUCTION_KEY, 0, count);
  } else {
    items = await db.zrevrange(AUCTION_KEY, 0, count);
  }

  return items.map((item: string) => JSON.parse(item));
};

export const clearAllLists = async () => {
  await db.flushall();
};

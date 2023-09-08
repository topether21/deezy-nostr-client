import Redis from 'ioredis';
import Redlock from 'redlock';
import { formatAuction, isSpent } from './services/nosft';
import { Auction, NosftEvent, RawNostrEvent, ValidKeys } from './types';
import { MAX_CAPACITY } from './config';
import crypto from 'crypto';
import { triggerTrackingService } from './queues/nostr';

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

const redlock = new Redlock([db as any], {});

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
      triggerTrackingService(item);
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

export const removeItem = async (item: NosftEvent) => {
  const lockKey = 'removeItemLock';
  let lock;
  try {
    lock = await redlock.acquire([lockKey], 5000);
    await removeItemAux(item);
  } catch (error) {
    console.log('Could not acquire lock', (error as Error).message);
  } finally {
    // Release the lock.
    if (lock) {
      try {
        // @ts-ignore
        await lock.release();
        console.log('Releasing lock...');
      } catch (unlockError) {
        console.log('[Error releasing lock]', unlockError);
      }
    }
  }
};

export const addOnSaleItem = async (item: NosftEvent) => {
  const lockKey = 'addOnSaleItemLock';
  let lock;
  try {
    lock = await redlock.acquire([lockKey], 5000);
    // console.log('Acquired lock, performing operation...');
    await addItemsAux(item); // assuming this is an async function
  } catch (err) {
    // console.log('Could not acquire lock', (err as Error).message);
  } finally {
    // Release the lock.
    if (lock) {
      try {
        // @ts-ignore
        await lock.release();
        // console.log('Releasing lock...');
      } catch (unlockError) {
        console.log('[Error releasing lock]', unlockError);
      }
    }
  }
};

export const validOrders = ['ASC', 'DESC'];

export const keys = ['sorted_by_created_at_all'];

export const removeItemAux = async (item: NosftEvent) => {
  try {
    const key = 'sorted_by_created_at_all';

    const existingItemTimestamp = await db.hget(key + '_hash', item.output);

    if (!existingItemTimestamp) {
      // The item doesn't exist, so skip
      return;
    }

    const multi = db.multi();

    // Remove the existing item
    const existingItems = await db.zrangebyscore(key, existingItemTimestamp, existingItemTimestamp);
    multi.zrem(key, existingItems[0]).hdel(key + '_hash', item.output);

    await multi.exec();

    // Publish events for the removal
    pub.publish('update_sets_on_sale', 'remove');
    await updateLastPushTimestamp();
    console.log('Published [remove][onsale] event to update_sets');
  } catch (err) {
    console.error(err);
    throw new Error('Error removing item from cache');
  }
};

export const loadMoreItems = () => {
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

type IsSpentResult = {
  spent: boolean | null;
  error: Error | null;
};

const safelyCheckIsSpent = async (item: NosftEvent): Promise<IsSpentResult> => {
  try {
    const result = await isSpent(item);
    return { spent: result.spent, error: null };
  } catch (error) {
    console.error(`Error checking item ${item.output}:`, (error as Error).message);
    return { spent: null, error: error as Error };
  }
};

// Function to validate a batch of items
const validateItemBatch = async (itemBatch: NosftEvent[], itemType: string): Promise<string[]> => {
  const soldItems: string[] = [];
  const isSpentResults: Promise<IsSpentResult>[] = itemBatch.map(safelyCheckIsSpent);
  const resolvedResults = await Promise.all(isSpentResults);

  for (let i = 0; i < itemBatch.length; i++) {
    const item = itemBatch[i];
    const result = resolvedResults[i];

    console.log(`Validating ${itemType} with output: ${item.output}`);

    if (result.error) {
      continue;
    }

    if (result.spent) {
      console.log(`${itemType} with output: ${item.output} is spent.`);
      await removeItem(item);
      soldItems.push(item.output);
    }
  }

  return soldItems;
};

export const validateItems = async (allItems: NosftEvent[], batchSize: number, itemType: string): Promise<string[]> => {
  const soldItems: string[] = [];

  try {
    const itemBatches: any[][] = [];

    // Create batches based on the specified batch size
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      itemBatches.push(batch);
    }

    // Validate each batch and collect sold items
    for (const itemBatch of itemBatches) {
      const batchSoldItems = await validateItemBatch(itemBatch, itemType);
      soldItems.push(...batchSoldItems);
    }
  } catch (error) {
    console.error('Error in validateItems', error);
  }

  return soldItems;
};

export const clearAllLists = async () => {
  await db.flushall();
};

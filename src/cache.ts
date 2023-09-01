// https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189
import { createClient } from 'redis';
import { isTextInscription } from './services/nosft';
import { subscribe } from './subscription';
import { NosftEvent, ValidKeys } from './types';

const auth = process.env.REDIS_TYPE === 'internal' ? {} : { password: process.env.REDIS_PASSWORD };

const redisConfig = {
  ...auth,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '17549'),
  },
};

const db = createClient(redisConfig);

const pub = db.duplicate();
const sub = db.duplicate();

export { pub, sub };

export const MAX_CAPACITY = process.env.MAX_CAPACITY ? parseInt(process.env.MAX_CAPACITY) : 10;
export const MIN_NON_TEXT_ITEMS = process.env.MIN_NON_TEXT_ITEMS ? parseInt(process.env.MIN_NON_TEXT_ITEMS) : 5;

const takeLatestInscription = (itemA: NosftEvent, itemB: NosftEvent): boolean => {
  return itemA.created_at >= itemB.created_at;
};

export const addItem = async (item: NosftEvent) => {
  const keys = {
    sorted_by_value_all: item.value,
    sorted_by_value_no_text: isTextInscription(item) ? null : item.value,
    sorted_by_created_at_all: item.created_at,
    sorted_by_created_at_no_text: isTextInscription(item) ? null : item.created_at,
    sorted_by_num_all: item.num,
    sorted_by_num_no_text: isTextInscription(item) ? null : item.num,
  };

  for (const [key, score] of Object.entries(keys)) {
    if (score !== null) {
      // Check for existing items with the same inscriptionId and num
      const existingItems = await db.zRange(key, 0, -1);
      let shouldAdd = true;

      for (const existingItem of existingItems) {
        const parsedItem = JSON.parse(existingItem);
        if (parsedItem.inscriptionId === item.inscriptionId && parsedItem.num === item.num) {
          if (takeLatestInscription(parsedItem, item)) {
            shouldAdd = false;
            break;
          } else {
            // Remove existing older item
            await db.zRem(key, existingItem);
          }
        }
      }

      if (shouldAdd) {
        // Add new item
        await db.zAdd(key, [
          {
            score: parseInt(score.toString()),
            value: JSON.stringify(item),
          },
        ]);

        pub.publish('update_sets', 'add');
        console.log('Published [add] event to update_sets');

        // Check for max capacity and remove the oldest item if needed
        const setSize = await db.zCount(key, '-inf', '+inf');
        if (setSize > MAX_CAPACITY) {
          const oldestItems = await db.zRange(key, 0, 0);
          if (oldestItems.length > 0) {
            await db.zRem(key, oldestItems[0]);
            pub.publish('update_sets', 'remove');
            console.log('Published [remove] event to update_sets');
          }
        }
      }
    }
  }

  // Existing code to check nonTextCount and possibly load more items
  const nonTextCount = await db.zCount('sorted_by_value_no_text', '-inf', '+inf');
  if (nonTextCount < MIN_NON_TEXT_ITEMS) {
    loadMoreItems();
  }
};

export const validOrders = ['ASC', 'DESC'];

export const keys = [
  'sorted_by_value_all',
  'sorted_by_value_no_text',
  'sorted_by_created_at_all',
  'sorted_by_created_at_no_text',
  'sorted_by_num_all',
  'sorted_by_num_no_text',
];

export const removeItem = async (item: NosftEvent) => {
  for (const key of keys) {
    await db.zRem(key, JSON.stringify(item));
  }

  const nonTextCount = await db.zCount('sorted_by_value_no_text', '-inf', '+inf');
  if (nonTextCount < MIN_NON_TEXT_ITEMS) {
    loadMoreItems();
  }
};

const loadMoreItems = () => {
  // Implement your logic here to add more non-text items
  console.log('Fetching more non-text items...');
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

export const clearAllLists = async () => {
  for (const key of keys) {
    await db.zRemRangeByRank(key, 0, -1);
  }
};

export const initCache = async () => {
  await Promise.all([pub.connect(), sub.connect(), db.connect()]);

  await clearAllLists();

  subscribe(MIN_NON_TEXT_ITEMS);
};

export {};

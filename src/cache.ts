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

export const MAX_CAPACITY = process.env.MAX_CAPACITY ? parseInt(process.env.MAX_CAPACITY) : 10;
export const MIN_NON_TEXT_ITEMS = process.env.MIN_QUEUE_SIZE ? parseInt(process.env.MIN_QUEUE_SIZE) : 5;

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
      await db.zAdd(key, [
        {
          score: parseInt(score.toString()),
          value: JSON.stringify(item),
        },
      ]);

      // Check for max capacity and remove the oldest item if needed
      const setSize = await db.zCount(key, '-inf', '+inf');
      if (setSize > MAX_CAPACITY) {
        const oldestItems = await db.zRange(key, 0, 0); // Fetch the oldest item
        if (oldestItems.length > 0) {
          await db.zRem(key, oldestItems[0]); // Remove the oldest item
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

(async () => {
  await db.connect();

  // await clearAllLists();

  const { openOrders$ } = subscribe(MIN_NON_TEXT_ITEMS);

  let previousOrders: NosftEvent[] = [];

  openOrders$.subscribe({
    next: async (currentOrders) => {
      // Print the total number of open orders
      console.log('openOrders', currentOrders.length);

      if (!currentOrders.length) {
        return;
      }

      // Find the orders that are new
      const newOrders = currentOrders.filter(
        (order) => !previousOrders.some((prevOrder) => prevOrder.inscriptionId === order.inscriptionId)
      );

      Promise.all(
        newOrders.map(async (newOrder) => {
          console.log('Newly added order:', newOrder.inscriptionId);
          await addItem(newOrder);
        })
      ).catch((error) => {
        console.error('An error occurred during processing:', error);
      });

      previousOrders = [...currentOrders];
    },
    error: (error) => {
      console.error('An error occurred:', error);
    },
  });
})();

export {};

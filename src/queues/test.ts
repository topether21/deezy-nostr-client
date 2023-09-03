import { Queue, QueueOptions } from 'bullmq';
import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let queue: Queue | null = null;

const auctionsConfig = {
  name: `Auctions Events`,
};

const auth = process.env.REDIS_TYPE === 'internal' ? {} : { password: process.env.REDIS_PASSWORD };

const redisConfig = {
  ...auth,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '17549'),
  },
};

const initServices = async (): Promise<void> => {
  if (!redisClient) {
    redisClient = createClient(redisConfig);
  }

  try {
    const pong = await redisClient.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis health check failed');
    }
  } catch (error) {
    console.error('Error with Redis:', error);

    // Reconnect to Redis
    redisClient = createClient(redisConfig);
  }

  if (!queue) {
    const queueOpts: QueueOptions = {
      connection: redisClient,
    };
    queue = new Queue(auctionsConfig.name, queueOpts);
  }
};

export const handler = async () => {
  await initServices();

  if (!queue) {
    return {
      statusCode: 500,
      body: JSON.stringify('Queue initialization failed'),
    };
  }

  try {
    await queue.add('my-job', {
      foo: 'bar',
    });

    return {
      statusCode: 200,
      body: JSON.stringify('Job added successfully!'),
    };
  } catch (error) {
    console.error('Failed to add job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify('Internal Server Error'),
    };
  }
};

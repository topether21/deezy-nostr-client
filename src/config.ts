import * as env from 'env-var';
import { cpus } from 'os';

const cpuCount: number = (() => {
  try {
    return cpus().length;
  } catch {
    /* istanbul ignore next */
    return 1;
  }
})();

export interface Config {
  minThreads: number;
  maxThreads: number;
  prefix: string;
  microserviceKey: string;
  hostname: string;
  port: number;
  redisType?: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  trackingWebsite: string;
}

export const config: Config = {
  minThreads: Math.max(cpuCount / 2, 1),
  maxThreads: cpuCount * 1.5,
  prefix: env.get('BITCASH_PREFIX').asString() || '',
  redisType: env.get('REDIS_TYPE').asString() || 'local',
  redisHost: env.get('REDIS_HOST').asString() || '',
  redisPort: env.get('REDIS_PORT').asIntPositive() || 19678,
  redisPassword: env.get('REDIS_PASSWORD').asString() || '',
  microserviceKey: env.get('MICROSERVICE_KEY').asString() || '',
  trackingWebsite: env.get('TRACKING_WEBHOOK').asString() || '',
  hostname: env.get('HOSTNAME').asString() || '0.0.0.0',
  port: env.get('PORT').asIntPositive() || 3000,
};

export const MAX_CAPACITY = process.env.MAX_CAPACITY ? parseInt(process.env.MAX_CAPACITY) : 10;
export const MIN_NON_TEXT_ITEMS = process.env.MIN_NON_TEXT_ITEMS ? parseInt(process.env.MIN_NON_TEXT_ITEMS) : 5;

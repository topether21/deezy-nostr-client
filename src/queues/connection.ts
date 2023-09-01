import { config } from './../config'

const credentials = config.redisType !== 'local' ? {} : { password: config.redisPassword }

export const connection = {
  ...credentials,
  password: config.redisPassword || '',
  host: config.redisHost,
  port: config.redisPort,
}

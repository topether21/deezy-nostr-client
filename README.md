# Deezy-Nostr Client

This is a Node.js service that fetches and caches data from the Nostr network and provides APIs and websockets for real-time updates.

## Technology Stack

This service is built with the following technologies:

- [Node.js](https://nodejs.org/): JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Express.js](https://expressjs.com/): Fast, unopinionated, minimalist web framework for Node.js.
- [Redis](https://redis.io/): An open-source, in-memory data structure store, used as a database, cache, and message broker.
- [Bull](https://github.com/OptimalBits/bull): A Node.js library that implements a robust queue system based on Redis.
- [Docker](https://www.docker.com/): A platform to develop, ship, and run applications inside containers.
- [AWS](https://aws.amazon.com/): Cloud services from Amazon Web Services (AWS) are used for deployment.
- [Nostr](https://github.com/fiatjaf/nostr): A network of events protocol that is used to fetch and cache data.

## Getting Started

To get started with the project, clone the repository and install the dependencies using pnpm:

```
git clone git@github.com:deezy-inc/deezy-nostr-client.git
cd deezy-nostr-client
pnpm install
```

## Running the Service

You can start the service in development mode using the following command:

```
pnpm run dev
```

For production, you can build the project and then start it:

```
pnpm run build
pnpm run start
```

## Environment Variables

The service requires several environment variables to run correctly. These can be set in a `.env` file in the root directory of the project. The required variables are:

- `MICROSERVICE_KEY`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_TYPE`
- `REDIS_PASSWORD`
- `PORT`

## Docker Compose

You can also use Docker Compose to run the service along with its dependencies. Make sure you have Docker Compose installed on your machine and then run the following command:

```
docker-compose up -d --build
# http://0.0.0.0:4005
# http://0.0.0.0:4005/api/v1/marketplace
# http://0.0.0.0:4005/admin/queues
```

## AWS Deployment

The service can be deployed on AWS using AWS App Runner and GitHub Actions. For more information, refer to the [AWS blog post](https://aws.amazon.com/blogs/containers/deploy-applications-in-aws-app-runner-with-github-actions/).

## Bull-Board

The service uses Bull-Board for queue management. You can access the Bull-Board UI at the `/admin/queues` endpoint.

## AWS Deployment

The service can be deployed on AWS using AWS App Runner and GitHub Actions. For more information, refer to the [AWS blog post](https://aws.amazon.com/blogs/containers/deploy-applications-in-aws-app-runner-with-github-actions/).

## API Endpoints

The service provides several API endpoints for fetching data:

- `/api/v1/marketplace`: Fetches marketplace data.
- `/api/v1/auctions`: Fetches auction data.
- `/api/v1/home`: Fetches home data.
- `/api/v1/marketplace/clean`: Clears all lists in the marketplace.
- `/api/v1/reboot`: Clears all lists and initializes cache.
- `/api/v1/auctions/sync`: Synchronizes auctions.

## Websockets

The service provides real-time updates through websockets. The available channels are:

- `onSale:10`
- `onAuction:10`
- `onSale`
- `onAuction`

## Testing

The service includes a suite of tests that can be run using the following command:

```
pnpm run test
```

## Contributing

Contributions are welcome. Please make sure to update tests as appropriate.

## License

This project is unlicensed.

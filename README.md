# P2P Worker

### Sync DB - Local

```
curl --location --request POST 'https://bitcash-hasura-dev-ymrgicuyta-uc.a.run.app/v1alpha1/pg_dump' \
  --header 'Content-Type: application/json' \
  --header 'X-Hasura-Role: admin' \
  --header 'Content-Type: text/plain' \
  --header 'x-hasura-admin-secret: XXX' \
  --data-raw '{ "opts": ["-O", "-x","--inserts",  "--schema", "public"], "clean_output": true, "source": "default"}' > hasura-db.sql
```

### Docker Compose

```
docker-compose -f bitcash.compose.yml up -d --no-deps --build bitcash-p2p
```

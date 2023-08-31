import app from './app';
import { config } from './config';
import cors from 'cors';
import { Response } from 'express';
import * as http from 'http';
import routes from './routes';
import './cache';

app.use(
  cors({
    origin: '*', // TODO: restrict to only a specific domains in production
  })
);

const server = http.createServer(app);

app.get('/status', (_, res: Response) => {
  res.send({
    status: 'ok',
  });
});

app.use('/', routes);

server.listen(config.port, config.hostname, async () => {
  console.log(`Server running at http://${config.hostname}:${config.port}`);
});

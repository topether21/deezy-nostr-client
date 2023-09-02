import app from './app';
import { config } from './config';
import cors from 'cors';
import { Response } from 'express';
import * as http from 'http';
import routes from './routes';
import admin from './queues/bull-board';
import { Server as IOServer } from 'socket.io';
import { setupSocketServer } from './sockets';
import { initCache } from './subscription';

app.use(cors());

const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: '*',
  },
});

app.get('/', (_, res: Response) => {
  res.send({
    status: 'ok',
    message: 'Welcome to the Deezy/Nostr API',
    version: require('../package.json').version,
  });
});

app.use('/', routes);

app.use('/admin/queues', admin);

(async () => {
  await initCache();
  await setupSocketServer(io);

  server.listen(config.port, config.hostname, async () => {
    console.log(`Server running at http://${config.hostname}:${config.port}`);
  });
})();

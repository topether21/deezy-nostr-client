import { Server, Socket } from 'socket.io';
import { fetchTopAuctionItems, fetchTopMarketplaceItems, sub } from './cache';

export type CHANNELS = 'onSale:10' | 'onAuction:10';

interface UpdatePayload {
  channel: CHANNELS;
  payload: any;
  operation: string;
}

const sendMessageToChannel = async (io: Server, channel: CHANNELS, operation: string) => {
  let data;
  const [channelName, numItems] = channel.split(':');

  const limit = numItems ? parseInt(numItems) : undefined;

  if (channelName === 'onAuction') {
    data = await fetchTopAuctionItems('DESC', limit);
  } else if (channelName === 'onSale') {
    data = await fetchTopMarketplaceItems('sorted_by_created_at_no_text', 'DESC', limit);
  }

  const payload: UpdatePayload = { channel: channelName as CHANNELS, payload: data, operation };
  io.to(channel).emit('update', payload);
};

export const setupSocketServer = async (io: Server) => {
  const listenerOnSale = async (message: string) => {
    console.log('[Subscriber]... getting sale updates', { message });
    await sendMessageToChannel(io, 'onSale:10', message);
  };

  await sub.subscribe('update_sets_on_sale', listenerOnSale);

  const listenerOnAuction = async (message: string) => {
    console.log('[Subscriber]... getting auction updates', { message });
    await sendMessageToChannel(io, 'onAuction:10', message);
  };

  await sub.subscribe('update_sets_on_auction', listenerOnAuction);

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinChannel', async (channel: CHANNELS) => {
      console.log(`Client ${socket.id} joined channel ${channel}`);
      socket.join(channel);
      await sendMessageToChannel(io, channel, 'start');
    });

    socket.on('leaveChannel', (channel: CHANNELS) => {
      console.log(`Client ${socket.id} left channel ${channel}`);
      socket.leave(channel);
    });

    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
    });
  });
};

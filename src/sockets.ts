import { Server, Socket } from 'socket.io';
import { fetchTopAuctionItems, fetchTopMarketplaceItems, sub } from './cache';
import { NosftEvent } from './types';

// Available OfferChannel

export type OfferChannel = 'onSale:10' | 'onAuction:10' | 'onSale' | 'onAuction';
const auctionChannels: OfferChannel[] = ['onAuction:10', 'onAuction'];
const saleChannels: OfferChannel[] = ['onSale:10', 'onSale'];

interface UpdatePayload {
  channel: OfferChannel;
  payload: any;
  operation: string;
}

const sendMessageToChannel = async (io: Server, channel: OfferChannel, operation: string) => {
  let data: NosftEvent[] = [];

  console.log('[sendMessageToChannel]', { channel, operation });

  if (channel === 'onAuction' || channel === 'onAuction:10') {
    data = await fetchTopAuctionItems('DESC');
  } else if (channel === 'onSale') {
    data = await fetchTopMarketplaceItems('sorted_by_created_at_all', 'DESC');
  }

  if (auctionChannels.includes(channel)) {
    const topAuctionsPayload: UpdatePayload = { channel: 'onAuction:10', payload: data.slice(0, 10), operation };
    const auctionsPayload: UpdatePayload = { channel: 'onAuction', payload: data, operation };

    io.to('onAuction:10').emit('update', topAuctionsPayload);
    io.to('onAuction').emit('update', auctionsPayload);
  } else if (saleChannels.includes(channel)) {
    const topSalesPayload: UpdatePayload = { channel: 'onSale:10', payload: data.slice(0, 10), operation };
    const salesPayload: UpdatePayload = { channel: 'onSale', payload: data, operation };

    io.to('onSale:10').emit('update', topSalesPayload);
    io.to('onSale').emit('update', salesPayload);
  }
};

export const setupSocketServer = async (io: Server) => {
  const listenerOnSale = async (message: string, channel: string) => {
    console.log('[Subscriber]... getting sale updates', { message, channel });
    await sendMessageToChannel(io, 'onAuction', message);
  };

  await sub.subscribe('update_sets_on_sale', listenerOnSale);

  const listenerOnAuction = async (message: string, channel: string) => {
    console.log('[Subscriber]... getting auction updates', { message, channel });
    await sendMessageToChannel(io, 'onAuction', message);
  };

  await sub.subscribe('update_sets_on_auction', listenerOnAuction);

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinChannel', async (channel: OfferChannel) => {
      console.log(`Client ${socket.id} joined channel ${channel}`);
      socket.join(channel);
      await sendMessageToChannel(io, channel, 'start');
    });

    socket.on('leaveChannel', (channel: OfferChannel) => {
      console.log(`Client ${socket.id} left channel ${channel}`);
      socket.leave(channel);
    });

    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
    });
  });
};

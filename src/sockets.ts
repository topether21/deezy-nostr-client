import { Server, Socket } from 'socket.io';
import { fetchTopAuctionItems, fetchTopMarketplaceItems, sub } from './cache';
import { NosftEvent } from './types';
import { isTextInscription } from './utils';

// Available OfferChannel

export type OfferChannel = 'onSale:10' | 'onAuction:10' | 'onSale' | 'onAuction';
const auctionChannels: OfferChannel[] = ['onAuction:10', 'onAuction'];
const saleChannels: OfferChannel[] = ['onSale:10', 'onSale'];

interface UpdatePayload {
  channel: OfferChannel;
  payload: any;
  operation: string;
}

const isAuctionChannel = (channel: OfferChannel) => auctionChannels.includes(channel);
const isSaleChannel = (channel: OfferChannel) => saleChannels.includes(channel);

const sendMessageToChannel = async (io: Server, channel: OfferChannel, operation: string) => {
  let data: NosftEvent[] = [];

  console.log('[sendMessageToChannel]', { channel, operation });

  if (isAuctionChannel(channel)) {
    data = await fetchTopAuctionItems('DESC');
  } else if (isSaleChannel(channel)) {
    data = await fetchTopMarketplaceItems('sorted_by_created_at_all', 'DESC');
  }

  if (isAuctionChannel(channel)) {
    const topAuctionsPayload: UpdatePayload = { channel: 'onAuction:10', payload: data.slice(0, 10), operation };
    const auctionsPayload: UpdatePayload = { channel: 'onAuction', payload: data, operation };

    io.to('onAuction:10').emit('update', topAuctionsPayload);
    io.to('onAuction').emit('update', auctionsPayload);
  } else if (isSaleChannel(channel)) {
    const auctions = await fetchTopAuctionItems();

    const marketplaceWithAuctionFlag = data.map((item) => {
      const auction = auctions.some((auction) => auction.sig === item.sig);
      return { ...item, auction };
    });

    const topSalesNoText = marketplaceWithAuctionFlag
      .filter((item) => !isTextInscription(item.content_type))
      .slice(0, 10);
    const topSalesPayload: UpdatePayload = { channel: 'onSale:10', payload: topSalesNoText, operation };
    const salesPayload: UpdatePayload = { channel: 'onSale', payload: marketplaceWithAuctionFlag, operation };

    io.to('onSale:10').emit('update', topSalesPayload);
    io.to('onSale').emit('update', salesPayload);
  }
};

export const setupSocketServer = async (io: Server) => {
  sub.subscribe('update_sets_on_sale', (err, count) => {
    if (err) {
      console.error('Failed to subscribe: %s', err.message);
    } else {
      console.log(
        `[update_sets_on_sale] Subscribed successfully! This client is currently subscribed to ${count} channels.`
      );
    }
  });

  sub.subscribe('update_sets_on_auction', (err, count) => {
    if (err) {
      console.error('Failed to subscribe: %s', err.message);
    } else {
      console.log(
        `[update_sets_on_auction] Subscribed successfully! This client is currently subscribed to ${count} channels.`
      );
    }
  });

  sub.on('message', async (channel: string, message: string) => {
    if (channel === 'update_sets_on_sale') {
      console.log('[Subscriber]... getting sale updates', { message, channel });
      await sendMessageToChannel(io, 'onSale', message);
    }
    if (channel === 'update_sets_on_auction') {
      console.log('[Subscriber]... getting auction updates', { message, channel });
      await sendMessageToChannel(io, 'onAuction', message);
    }
  });

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

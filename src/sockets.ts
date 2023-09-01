import { Server, Socket } from 'socket.io';
import { fetchTopMarketplaceItems, sub } from './cache';

export const setupSocketServer = async (io: Server) => {
  const listener = async (message: string, channel: string) => {
    try {
      console.log('[Subscriber]... getting updates', { message, channel });
      const salesData = await fetchTopMarketplaceItems('sorted_by_created_at_no_text', 'DESC');
      io.to('onSale').emit('update', { channel: 'onSale', payload: salesData, operation: message });
    } catch (error) {
      console.error('Failed to fetch or send updates:', error);
    }
  };

  await sub.subscribe('update_sets', listener);

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    const sendUpdates = async () => {
      try {
        const salesData = await fetchTopMarketplaceItems('sorted_by_created_at_no_text', 'DESC', 10);
        console.log('Fetched sales data:', salesData.length);
        io.to('onSale').emit('update', { channel: 'onSale', payload: salesData, operation: 'start' });
      } catch (error) {
        console.error('Failed to fetch or send updates:', error);
      }
    };

    socket.on('joinChannel', (channel: string) => {
      console.log(`Client ${socket.id} joined channel ${channel}`);
      socket.join(channel);
      sendUpdates(); // send current list of items from redis
    });

    socket.on('leaveChannel', (channel: string) => {
      console.log(`Client ${socket.id} left channel ${channel}`);
      socket.leave(channel);
    });

    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
    });
  });
};

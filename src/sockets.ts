import { Server, Socket } from 'socket.io';
import { fetchTopMarketplaceItems } from './cache'; // Adjust imports

export const setupSocketServer = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    const sendUpdates = async () => {
      try {
        const salesData = await fetchTopMarketplaceItems('sorted_by_created_at_no_text', 'DESC', 10);
        console.log('Fetched sales data:', salesData.length);
        io.to('onSale').emit('update', { channel: 'onSale', payload: salesData });
      } catch (error) {
        console.error('Failed to fetch or send updates:', error);
      }
    };

    socket.on('joinChannel', (channel: string) => {
      console.log(`Client ${socket.id} joined channel ${channel}`);
      socket.join(channel);
      sendUpdates();
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

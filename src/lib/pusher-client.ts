import Pusher from 'pusher-js';

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

export const pusherClient = new Pusher(pusherKey, {
  cluster: pusherCluster,
  forceTLS: true,
});

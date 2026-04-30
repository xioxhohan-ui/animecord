import Pusher from 'pusher-js';
let pusherClient: any;

if (typeof window !== 'undefined') {
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';
  
  pusherClient = new Pusher(pusherKey, {
    cluster: pusherCluster,
    forceTLS: true,
  });
}

export { pusherClient };

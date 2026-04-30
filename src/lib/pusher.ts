import Pusher from 'pusher';

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'mt1',
  useTLS: true,
});

export async function triggerRealtime(channel: string, event: string, data: any) {
  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error('Pusher trigger error:', error);
  }
}

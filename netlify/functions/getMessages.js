import { readBlob, getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const { channelId, limit = 50 } = event.queryStringParameters;
  if (!channelId) return response({ error: 'Missing channelId' }, 400);

  const servers = await readBlob('data', 'servers');
  const server = servers.find(s => s.channels.some(c => c.id === channelId));
  if (!server) return response({ error: 'Channel not found' }, 404);

  const isMember = server.members.some(m => m.userId === user.id);
  if (!isMember && user.role !== 'CEO') return response({ error: 'Access denied' }, 403);

  const messages = await readBlob('data', 'messages');
  const users = await readBlob('data', 'users');

  const filtered = messages
    .filter(m => m.channelId === channelId)
    .slice(-Number(limit))
    .map(m => {
      const sender = users.find(u => u.id === m.senderId);
      return { 
        ...m, 
        senderName: sender?.displayName || 'Unknown', 
        senderAvatar: sender?.avatar || '', 
        senderFrame: sender?.activeFrame || null 
      };
    });

  return response(filtered);
};

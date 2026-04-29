import { readBlob, writeBlob, getAuthUser, response, checkBanned, genId } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const { action, payload } = event.httpMethod === 'POST' ? JSON.parse(event.body) : { action: 'list', payload: event.queryStringParameters };
  
  const dms = await readBlob('data', 'dms');
  const users = await readBlob('data', 'users');

  if (action === 'send') {
    const { toUserId, content } = payload;
    const msg = {
      id: genId(),
      fromUserId: user.id,
      toUserId,
      content,
      timestamp: Date.now(),
      read: false
    };
    dms.push(msg);
    await writeBlob('data', 'dms', dms);
    return response(msg);
  }

  if (action === 'get_messages') {
    const { otherUserId } = payload;
    const filtered = dms.filter(m => 
      (m.fromUserId === user.id && m.toUserId === otherUserId) ||
      (m.fromUserId === otherUserId && m.toUserId === user.id)
    );
    return response(filtered);
  }

  if (action === 'get_conversations') {
    const convsMap = new Map();
    dms.forEach(m => {
      const otherId = m.fromUserId === user.id ? m.toUserId : m.fromUserId;
      if (otherId === user.id) return;
      
      const otherUser = users.find(u => u.id === otherId);
      if (!otherUser) return;

      const existing = convsMap.get(otherId);
      if (!existing || m.timestamp > existing.timestamp) {
        convsMap.set(otherId, {
          userId: otherId,
          displayName: otherUser.displayName,
          username: otherUser.username,
          avatar: otherUser.avatar,
          lastMessage: m.content,
          timestamp: m.timestamp,
          unread: (!m.read && m.toUserId === user.id) ? 1 : 0
        });
      } else if (!m.read && m.toUserId === user.id) {
        existing.unread++;
      }
    });

    return response(Array.from(convsMap.values()).sort((a, b) => b.timestamp - a.timestamp));
  }

  return response({ error: 'Unknown action' }, 400);
};

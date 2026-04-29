import { readBlob, getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user || user.role !== 'CEO') return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const users = await readBlob('data', 'users');
  const servers = await readBlob('data', 'servers');
  const messages = await readBlob('data', 'messages');
  const bannedUsers = await readBlob('data', 'bannedUsers');
  
  const now = Date.now();
  const activeUsers = users.filter(u => now - (u.lastActive || 0) < 600000).length;
  const messagesLastHour = messages.filter(m => now - m.timestamp < 3600000).length;

  return response({
    totalUsers: users.length,
    activeUsers,
    totalServers: servers.length,
    totalMessages: messages.length,
    totalBans: bannedUsers.length,
    messagesPerMinute: Math.round(messagesLastHour / 60),
    suspiciousUsers: users.filter(u => (u.riskScore || 0) > 50).length
  });
};

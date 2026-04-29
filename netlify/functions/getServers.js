import { readBlob, getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const servers = await readBlob('data', 'servers');
  const users = await readBlob('data', 'users');

  const myServers = servers.filter(s => s.members.some(m => m.userId === user.id) || s.isPublic);

  const enriched = myServers.map(s => ({
    ...s,
    ownerName: users.find(u => u.id === s.ownerId)?.displayName || 'Unknown',
    memberCount: s.members.length,
  }));

  return response(enriched);
};

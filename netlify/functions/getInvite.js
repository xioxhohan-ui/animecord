import { readBlob, response } from './utils/db.js';

export const handler = async (event) => {
  const { code } = event.queryStringParameters || {};
  if (!code) return response({ error: 'Missing code' }, 400);

  const servers = await readBlob('data', 'servers');
  const server = servers.find(s => s.inviteCode === code);
  
  if (!server) return response({ error: 'Invite not found' }, 404);

  return response({
    id: server.id,
    name: server.name,
    avatar: server.avatar,
    banner: server.banner,
    memberCount: server.members.length
  });
};

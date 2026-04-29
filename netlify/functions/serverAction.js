import { readBlob, writeBlob, getAuthUser, response, checkBanned, genId } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const { action, payload } = JSON.parse(event.body);
  const servers = await readBlob('data', 'servers');

  if (action === 'create') {
    const server = {
      id: genId(),
      name: payload.name,
      ownerId: user.id,
      members: [{ userId: user.id, role: 'owner' }],
      channels: [{ id: genId(), name: 'general' }],
      isPublic: true,
      inviteCode: genId().slice(0, 8),
      createdAt: Date.now()
    };
    servers.push(server);
    await writeBlob('data', 'servers', servers);
    return response(server);
  }

  if (action === 'join') {
    const sIdx = servers.findIndex(s => s.id === payload.serverId || (payload.inviteCode && s.inviteCode === payload.inviteCode));
    if (sIdx === -1) return response({ error: 'Server not found' }, 404);
    if (servers[sIdx].members.some(m => m.userId === user.id)) return response({ error: 'Already a member' }, 400);
    
    servers[sIdx].members.push({ userId: user.id, role: 'member' });
    
    if (payload.gender || payload.age) {
      const users = await readBlob('data', 'users');
      const uIdx = users.findIndex(u => u.id === user.id);
      if (uIdx !== -1) {
        if (payload.gender) users[uIdx].gender = payload.gender;
        if (payload.age) users[uIdx].age = payload.age;
        await writeBlob('data', 'users', users);
      }
    }

    await writeBlob('data', 'servers', servers);
    return response({ success: true });
  }

  if (action === 'leave') {
    const sIdx = servers.findIndex(s => s.id === payload.serverId);
    if (sIdx === -1) return response({ error: 'Server not found' }, 404);
    servers[sIdx].members = servers[sIdx].members.filter(m => m.userId !== user.id);
    await writeBlob('data', 'servers', servers);
    return response({ success: true });
  }

  if (action === 'edit') {
    const sIdx = servers.findIndex(s => s.id === payload.serverId);
    if (sIdx === -1) return response({ error: 'Server not found' }, 404);
    const member = servers[sIdx].members.find(m => m.userId === user.id);
    if (!member || (member.role !== 'owner' && user.role !== 'CEO')) return response({ error: 'Forbidden' }, 403);
    
    const allowed = ['name', 'avatar', 'banner', 'description'];
    allowed.forEach(key => { if (payload[key] !== undefined) servers[sIdx][key] = payload[key]; });
    
    await writeBlob('data', 'servers', servers);
    return response(servers[sIdx]);
  }

  if (action === 'delete') {
    const sIdx = servers.findIndex(s => s.id === payload.serverId);
    if (sIdx === -1) return response({ error: 'Server not found' }, 404);
    if (servers[sIdx].ownerId !== user.id && user.role !== 'CEO') return response({ error: 'Forbidden' }, 403);
    
    servers.splice(sIdx, 1);
    await writeBlob('data', 'servers', servers);
    return response({ success: true });
  }

  if (action === 'transfer_owner') {
    const sIdx = servers.findIndex(s => s.id === payload.serverId);
    if (sIdx === -1) return response({ error: 'Server not found' }, 404);
    if (servers[sIdx].ownerId !== user.id && user.role !== 'CEO') return response({ error: 'Forbidden' }, 403);
    
    servers[sIdx].ownerId = payload.userId;
    const oldOwner = servers[sIdx].members.find(m => m.userId === user.id);
    if (oldOwner) oldOwner.role = 'member';
    const newOwner = servers[sIdx].members.find(m => m.userId === payload.userId);
    if (newOwner) newOwner.role = 'owner';
    else servers[sIdx].members.push({ userId: payload.userId, role: 'owner' });

    await writeBlob('data', 'servers', servers);
    return response({ success: true });
  }

  if (action === 'kick') {
    const sIdx = servers.findIndex(s => s.id === payload.serverId);
    if (sIdx === -1) return response({ error: 'Server not found' }, 404);
    const member = servers[sIdx].members.find(m => m.userId === user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && user.role !== 'CEO')) return response({ error: 'Forbidden' }, 403);

    servers[sIdx].members = servers[sIdx].members.filter(m => m.userId !== payload.userId);
    await writeBlob('data', 'servers', servers);
    return response({ success: true });
  }

  if (action === 'create_invite') {
    const sIdx = servers.findIndex(s => s.id === payload.serverId);
    if (sIdx === -1) return response({ error: 'Server not found' }, 404);
    const member = servers[sIdx].members.find(m => m.userId === user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && user.role !== 'CEO')) return response({ error: 'Forbidden' }, 403);

    const code = genId().slice(0, 8);
    servers[sIdx].inviteCode = code;
    await writeBlob('data', 'servers', servers);
    return response({ inviteCode: code });
  }

  return response({ error: 'Unknown action' }, 400);
};

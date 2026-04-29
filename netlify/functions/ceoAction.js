import { readBlob, writeBlob, getAuthUser, response, checkBanned, genId } from './utils/db.js';

export const handler = async (event) => {
  const admin = await getAuthUser(event);
  if (!admin || !['CEO', 'ADMIN'].includes(admin.role)) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, admin)) return response({ error: 'Banned', status: 'banned' }, 403);

  const { action, payload } = JSON.parse(event.body);
  const users = await readBlob('data', 'users');

  if (action === 'ban') {
    const targetUserId = payload.userId;
    const uIdx = users.findIndex(u => u.id === targetUserId);
    if (uIdx === -1) return response({ error: 'User not found' }, 404);
    if (users[uIdx].role === 'CEO') return response({ error: 'Cannot ban CEO' }, 400);

    const targetUser = users[uIdx];
    targetUser.banned = true;
    
    // Ban device if exists
    if (targetUser.deviceId) {
      const bannedDevices = await readBlob('data', 'bannedDevices');
      if (!bannedDevices.includes(targetUser.deviceId)) {
        bannedDevices.push(targetUser.deviceId);
        await writeBlob('data', 'bannedDevices', bannedDevices);
      }
    }

    // Ban IP if exists
    if (targetUser.ip) {
      const bannedIPs = await readBlob('data', 'bannedIPs');
      if (!bannedIPs.some(b => b.ip === targetUser.ip)) {
        bannedIPs.push({ ip: targetUser.ip, userId: targetUser.id, bannedAt: Date.now(), reason: payload.reason });
        await writeBlob('data', 'bannedIPs', bannedIPs);
      }
    }

    // Purge messages
    let messages = await readBlob('data', 'messages');
    messages = messages.filter(m => m.senderId !== targetUserId);
    await writeBlob('data', 'messages', messages);

    // Save logs
    const logs = await readBlob('data', 'moderationLogs');
    logs.unshift({
      id: genId(),
      actionType: 'USER_BAN',
      targetId: targetUserId,
      performedBy: admin.id,
      reason: payload.reason || 'No reason provided',
      timestamp: Date.now()
    });
    await writeBlob('data', 'moderationLogs', logs);
    await writeBlob('data', 'users', users);

    return response({ success: true, message: 'User permanently banned' });
  }

  if (action === 'promote_admin') {
    const targetUserId = payload.userId;
    const uIdx = users.findIndex(u => u.id === targetUserId);
    if (uIdx === -1) return response({ error: 'User not found' }, 404);
    
    users[uIdx].role = 'ADMIN';
    users[uIdx].coins = 30; // Per user request
    await writeBlob('data', 'users', users);

    const logs = await readBlob('data', 'moderationLogs');
    logs.unshift({
      id: genId(),
      actionType: 'ADMIN_PROMOTION',
      targetId: targetUserId,
      performedBy: admin.id,
      timestamp: Date.now()
    });
    await writeBlob('data', 'moderationLogs', logs);

    return response({ success: true, message: 'User promoted to Admin with 30 tk balance' });
  }

  if (action === 'adjust_balance') {
    const { userId, amount } = payload;
    const uIdx = users.findIndex(u => u.id === userId);
    if (uIdx === -1) return response({ error: 'User not found' }, 404);
    
    users[uIdx].coins = Number(amount);
    await writeBlob('data', 'users', users);
    return response({ success: true, balance: users[uIdx].coins });
  }
  
  return response({ error: 'Unknown action' }, 400);
};

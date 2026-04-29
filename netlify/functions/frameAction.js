import { readBlob, writeBlob, getAuthUser, response, checkBanned, genId } from './utils/db.js';

const FRAMES = [
  { id: 'f1', name: 'Zhongli Geo', filename: 'zhongli.PNG' },
  { id: 'f2', name: 'Raiden Electro', filename: 'raiden.PNG' },
  { id: 'f3', name: 'Venti Anemo', filename: 'venti.PNG' },
  { id: 'f4', name: 'Nahida Dendro', filename: 'nahida.PNG' },
  { id: 'f5', name: 'Furina Hydro', filename: 'furina.PNG' },
  { id: 'f6', name: 'Xiao Mask', filename: 'xiao.PNG' },
  { id: 'f7', name: 'Hutao Ghost', filename: 'hutao.PNG' },
  { id: 'f8', name: 'Klee Boom', filename: 'klee.PNG' },
  { id: 'f9', name: 'Ganyu Cryo', filename: 'ganyu.PNG' },
  { id: 'f10', name: 'Ayaka Cryo', filename: 'ayaka.PNG' },
];

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  let action = 'list';
  let payload = {};

  if (event.httpMethod === 'POST' && event.body) {
    try {
      const body = JSON.parse(event.body);
      action = body.action || 'list';
      payload = body.payload || {};
    } catch (e) {}
  } else if (event.queryStringParameters && event.queryStringParameters.action) {
    action = event.queryStringParameters.action;
  }

  const users = await readBlob('data', 'users');

  if (action === 'list') {
    return response(FRAMES);
  }

  if (action === 'claim') {
    const { frameId } = payload;
    const targetFrame = FRAMES.find(f => f.id === frameId);
    if (!targetFrame) return response({ error: 'Frame not found' }, 404);

    const uIdx = users.findIndex(u => u.id === user.id);
    if (uIdx === -1) return response({ error: 'User not found' }, 404);

    if (!users[uIdx].ownedFrames) users[uIdx].ownedFrames = [];
    if (!users[uIdx].ownedFrames.includes(frameId)) {
      users[uIdx].ownedFrames.push(frameId);
    }

    await writeBlob('data', 'users', users);
    return response({ success: true });
  }

  if (action === 'equip') {
    const { frameId } = payload;
    const uIdx = users.findIndex(u => u.id === user.id);
    if (uIdx === -1) return response({ error: 'User not found' }, 404);

    if (user.role !== 'CEO' && frameId && !users[uIdx].ownedFrames?.includes(frameId)) {
      return response({ error: 'Frame not owned' }, 403);
    }

    users[uIdx].activeFrame = frameId || null;
    await writeBlob('data', 'users', users);
    
    const { password_hash, ...safeUser } = users[uIdx];
    return response({ user: safeUser });
  }

  if (action === 'gift') {
    if (!['CEO', 'ADMIN'].includes(user.role)) return response({ error: 'Forbidden' }, 403);
    const { toUserId, frameId } = payload;
    
    const targetIdx = users.findIndex(u => u.id === toUserId);
    if (targetIdx === -1) return response({ error: 'Target user not found' }, 404);

    if (!users[targetIdx].ownedFrames) users[targetIdx].ownedFrames = [];
    if (!users[targetIdx].ownedFrames.includes(frameId)) {
      users[targetIdx].ownedFrames.push(frameId);
    }

    await writeBlob('data', 'users', users);
    
    const logs = await readBlob('data', 'moderationLogs');
    logs.unshift({
      id: genId(),
      actionType: 'FRAME_GIFT',
      targetId: toUserId,
      performedBy: user.id,
      frameId,
      timestamp: Date.now()
    });
    await writeBlob('data', 'moderationLogs', logs);

    return response({ success: true });
  }

  return response({ error: 'Unknown action' }, 400);
};

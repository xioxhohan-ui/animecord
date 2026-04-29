import { readBlob, writeBlob, getAuthUser, response, checkBanned, genId } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const body = JSON.parse(event.body);
  const messages = await readBlob('data', 'messages');

  if (body.action === 'delete') {
    const { messageId } = body.payload;
    const mIdx = messages.findIndex(m => m.id === messageId);
    if (mIdx === -1) return response({ error: 'Message not found' }, 404);
    if (messages[mIdx].senderId !== user.id && !['CEO', 'ADMIN'].includes(user.role)) return response({ error: 'Forbidden' }, 403);

    messages.splice(mIdx, 1);
    await writeBlob('data', 'messages', messages);
    return response({ success: true });
  }

  if (body.action === 'react') {
    const { messageId, emoji } = body.payload;
    const mIdx = messages.findIndex(m => m.id === messageId);
    if (mIdx === -1) return response({ error: 'Message not found' }, 404);

    if (!messages[mIdx].reactions) messages[mIdx].reactions = {};
    if (!messages[mIdx].reactions[emoji]) messages[mIdx].reactions[emoji] = [];

    const uIdx = messages[mIdx].reactions[emoji].indexOf(user.id);
    if (uIdx !== -1) messages[mIdx].reactions[emoji].splice(uIdx, 1);
    else messages[mIdx].reactions[emoji].push(user.id);

    await writeBlob('data', 'messages', messages);
    return response(messages[mIdx]);
  }

  // Default send message logic
  const { channelId, content, attachments } = body;
  if (!channelId || !content?.trim()) return response({ error: 'Missing fields' }, 400);

  const users = await readBlob('data', 'users');
  const userRecent = messages.filter(m => m.senderId === user.id && Date.now() - m.timestamp < 5000);
  if (userRecent.length >= 10) {
    const uIdx = users.findIndex(u => u.id === user.id);
    if (uIdx !== -1) {
      users[uIdx].riskScore = Math.min(100, (users[uIdx].riskScore || 0) + 20);
      await writeBlob('data', 'users', users);
    }
    return response({ error: 'Slow down! Too many messages.' }, 429);
  }

  const msg = {
    id: genId(),
    channelId,
    senderId: user.id,
    senderName: user.displayName,
    senderAvatar: user.avatar,
    senderFrame: user.activeFrame || null,
    content: content.trim(),
    attachments: attachments || null,
    reactions: {},
    timestamp: Date.now(),
  };

  messages.push(msg);
  if (messages.length > 1000) messages.shift();
  await writeBlob('data', 'messages', messages);

  return response(msg, 201);
};

import { readBlob, writeBlob, getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const updates = JSON.parse(event.body);
  const users = await readBlob('data', 'users');
  const idx = users.findIndex(u => u.id === user.id);
  
  if (idx === -1) return response({ error: 'User not found' }, 404);

  const allowedUpdates = ['displayName', 'bio', 'avatar', 'banner', 'status', 'gender', 'age'];
  allowedUpdates.forEach(key => {
    if (updates[key] !== undefined) users[idx][key] = updates[key];
  });

  await writeBlob('data', 'users', users);
  
  const { password_hash, ...safeUser } = users[idx];
  return response({ user: safeUser });
};

import { getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const { password_hash, ...safeUser } = user;
  return response({ user: safeUser });
};

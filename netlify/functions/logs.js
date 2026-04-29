import { readBlob, getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user || !['CEO', 'ADMIN'].includes(user.role)) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const logs = await readBlob('data', 'moderationLogs');
  return response(logs);
};

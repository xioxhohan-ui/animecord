import { getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  // If not logged in, we don't care about ban status for the session check
  if (!user) return response({ banned: false });
  
  const banned = await checkBanned(event, user);
  return response({ banned });
};

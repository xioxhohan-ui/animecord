import { readBlob, writeBlob, getAuthUser, response, checkBanned } from './utils/db.js';

export const handler = async (event) => {
  const user = await getAuthUser(event);
  if (!user) return response({ error: 'Unauthorized' }, 401);
  if (await checkBanned(event, user)) return response({ error: 'Banned', status: 'banned' }, 403);

  const { channelId, dmUserId } = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
  if (!channelId && !dmUserId) return response({ error: 'Missing context' }, 400);

  const typingStore = await readBlob('data', 'typing');
  const now = Date.now();
  
  if (event.httpMethod === 'POST') {
    // Upsert typing status
    const key = channelId ? { channelId } : { dmUserId, targetId: user.id }; // Simplified logic: who is typing and where
    const existingIdx = typingStore.findIndex(t => 
      t.userId === user.id && 
      (channelId ? t.channelId === channelId : (t.dmUserId === dmUserId && t.targetId === user.id))
    );

    if (existingIdx !== -1) {
      typingStore[existingIdx].timestamp = now;
    } else {
      typingStore.push({ 
        userId: user.id, 
        userName: user.displayName, 
        channelId, 
        dmUserId, 
        targetId: dmUserId, // Who they are typing TO
        timestamp: now 
      });
    }
    
    // Cleanup old typing statuses (> 5s)
    const cleaned = typingStore.filter(t => now - t.timestamp < 5000);
    await writeBlob('data', 'typing', cleaned);
    return response({ success: true });
  }

  // GET: Return users typing in this context (excluding self)
  const typingContext = typingStore.filter(t => {
    const matchesContext = channelId 
      ? t.channelId === channelId 
      : (t.dmUserId === user.id && t.userId === dmUserId); // If I am user.id, is dmUserId typing TO me?
    return matchesContext && t.userId !== user.id && now - t.timestamp < 5000;
  });

  return response(typingContext);
};

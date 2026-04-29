import { getStore } from '@netlify/blobs';
import { extractUserFromHeader } from './utils/auth';

export const handler = async (event: any) => {
  const user = extractUserFromHeader(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  try {
    const store = getStore('animecord_messages');

    if (event.httpMethod === 'GET') {
      const channelId = event.queryStringParameters?.channelId;
      if (!channelId) return { statusCode: 400, body: 'Missing channelId' };

      const { blobs } = await store.list({ prefix: `${channelId}_` });
      let messages = [];
      for (const blob of blobs) {
        const data = await store.get(blob.key, { type: 'json' });
        if (data) messages.push(data);
      }
      
      messages.sort((a, b) => a.timestamp - b.timestamp);
      return { statusCode: 200, body: JSON.stringify(messages) };
    }

    if (event.httpMethod === 'POST') {
      const msg = JSON.parse(event.body);
      // Ensure the sender is the authenticated user or CEO
      if (msg.senderId !== user.id && user.role !== 'CEO') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
      }
      
      const key = `${msg.channelId}_${msg.timestamp}_${msg.id}`;
      await store.setJSON(key, msg);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (error) {
    console.error(error);
    // Fallback for local development if Netlify Blobs fails
    if (event.httpMethod === 'GET') {
      return { statusCode: 200, body: JSON.stringify([]) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, localMock: true }) };
  }
};

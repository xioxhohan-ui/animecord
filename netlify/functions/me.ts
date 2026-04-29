import { getStore } from '@netlify/blobs';
import { extractUserFromHeader } from './utils/auth';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const tokenUser = extractUserFromHeader(event.headers);
    if (!tokenUser) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const store = getStore('animecord_users');
    const user = await store.get(tokenUser.id, { type: 'json' });

    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    const { password_hash: _, ...userWithoutPassword } = user;

    return { 
      statusCode: 200, 
      body: JSON.stringify({ user: userWithoutPassword }) 
    };

  } catch (error: any) {
    console.error('Me error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};

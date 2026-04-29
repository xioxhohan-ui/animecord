import { extractUserFromHeader } from './utils/auth';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const user = extractUserFromHeader(event.headers);
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    // STRICT ROLE CHECK
    if (user.role !== 'ADMIN' && user.role !== 'CEO') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Admin access required' }) };
    }

    const { action, payload } = JSON.parse(event.body);
    
    // Process Admin actions here (mocked for now)
    if (action === 'kick_user') {
       return { statusCode: 200, body: JSON.stringify({ success: true, message: `Kicked ${payload.userId}` }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (error: any) {
    console.error('Admin action error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};

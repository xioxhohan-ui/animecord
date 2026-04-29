import { getStore } from '@netlify/blobs';
import bcrypt from 'bcryptjs';
import { generateToken } from './utils/auth';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { username, password } = JSON.parse(event.body);
    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Username and password required' }) };
    }

    const store = getStore('animecord_users');
    
    const { blobs } = await store.list();
    let foundUser = null;
    
    for (const blob of blobs) {
      const user = await store.get(blob.key, { type: 'json' });
      if (user && user.username === username) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    const isMatch = await bcrypt.compare(password, foundUser.password_hash);
    if (!isMatch) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    const token = generateToken(foundUser);
    const { password_hash: _, ...userWithoutPassword } = foundUser;

    return { 
      statusCode: 200, 
      body: JSON.stringify({ token, user: userWithoutPassword }) 
    };

  } catch (error: any) {
    console.error('Login error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};

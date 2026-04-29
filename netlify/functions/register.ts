import { getStore } from '@netlify/blobs';
import bcrypt from 'bcryptjs';
import { generateToken } from './utils/auth';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { username, password } = JSON.parse(event.body);
    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Username and password required' }) };
    }

    const store = getStore('animecord_users');
    
    // Check if user exists (mock approach: list all and find, since Netlify KV doesn't have indexes)
    const { blobs } = await store.list();
    for (const blob of blobs) {
      const existingUser = await store.get(blob.key, { type: 'json' });
      if (existingUser && existingUser.username === username) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Username already exists' }) };
      }
    }

    let role = 'USER';
    if (username.toLowerCase() === 'ceo') role = 'CEO';
    if (username.toLowerCase() === 'admin') role = 'ADMIN';

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      id: generateId(),
      username,
      password_hash,
      role,
      displayName: username,
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
      bio: `I am a ${role}`,
      status: 'online',
    };

    await store.setJSON(newUser.id, newUser);

    const token = generateToken(newUser);
    
    // Don't send password hash to client
    const { password_hash: _, ...userWithoutPassword } = newUser;

    return { 
      statusCode: 200, 
      body: JSON.stringify({ token, user: userWithoutPassword }) 
    };

  } catch (error: any) {
    console.error('Register error:', error);
    
    // Local dev fallback if Netlify CLI Blobs aren't linked properly
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error. Make sure you are using netlify dev for local testing.' })
    };
  }
};

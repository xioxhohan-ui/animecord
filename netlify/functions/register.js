import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readBlob, writeBlob, response, checkBanned, genId } from './utils/db.js';

const JWT_SECRET = 'animecord-local-secret-2024';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return response({ error: 'Method not allowed' }, 405);
  
  const { username, password, displayName, deviceId } = JSON.parse(event.body);
  if (!username || !password) return response({ error: 'Missing fields' }, 400);

  if (await checkBanned(event)) return response({ error: 'Banned' }, 403);

  const users = await readBlob('data', 'users');
  if (users.find(u => u.username === username.toLowerCase()))
    return response({ error: 'Username taken' }, 400);

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: genId(),
    username: username.toLowerCase(),
    password_hash: hash,
    role: 'USER',
    displayName: displayName || username,
    avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}&backgroundColor=b6e3f4`,
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
    bio: 'New to AnimeCord!',
    status: 'online',
    lastActive: Date.now(),
    banned: false,
    riskScore: 0,
    deviceId,
    ownedFrames: [],
    coins: 10,
    ip: event.headers['x-forwarded-for'] || '127.0.0.1',
  };

  users.push(user);
  await writeBlob('data', 'users', users);

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  const { password_hash, ...safeUser } = user;
  
  return response({ token, user: safeUser });
};

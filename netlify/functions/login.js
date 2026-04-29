import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readBlob, writeBlob, response, checkBanned } from './utils/db.js';

const JWT_SECRET = 'animecord-local-secret-2024';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const { username, password, deviceId } = JSON.parse(event.body);
  
  if (await checkBanned(event)) return response({ error: 'Banned' }, 403);

  const users = await readBlob('data', 'users');
  const user = users.find(u => u.username === username?.toLowerCase());
  
  if (!user || user.banned) return response({ error: 'Invalid credentials' }, 401);
  
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return response({ error: 'Invalid credentials' }, 401);

  user.lastActive = Date.now();
  user.deviceId = deviceId || user.deviceId;
  user.ip = event.headers['x-forwarded-for'] || '127.0.0.1';

  await writeBlob('data', 'users', users);

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  const { password_hash, ...safeUser } = user;

  return response({ token, user: safeUser });
};

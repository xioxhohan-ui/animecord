import { getStore } from '@netlify/blobs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'animecord-local-secret-2024';

export const getDB = (name) => getStore(name);

export const readBlob = async (storeName, key) => {
  const store = getDB(storeName);
  const data = await store.get(key, { type: 'json' });
  return data || [];
};

export const writeBlob = async (storeName, key, data) => {
  const store = getDB(storeName);
  await store.setJSON(key, data);
};

export const getAuthUser = async (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await readBlob('data', 'users');
    
    // Seed CEO if no users exist (initial setup)
    if (users.length === 0) {
      const hash = await import('bcryptjs').then(m => m.default.hash('ceo123', 10));
      const ceo = {
        id: 'ceo-id',
        username: 'ceo',
        password_hash: hash,
        role: 'CEO',
        displayName: 'CEO',
        avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=ceo&backgroundColor=b6e3f4',
        coins: 1000,
        banned: false
      };
      users.push(ceo);
      await writeBlob('data', 'users', users);
    }

    const user = users.find(u => u.id === decoded.id);
    if (!user || user.banned) return null;
    return user;
  } catch (e) {
    return null;
  }
};

export const checkBanned = async (event, user = null) => {
  const deviceId = event.headers['x-device-id'];
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '127.0.0.1';

  const bannedDevices = await readBlob('data', 'bannedDevices');
  if (deviceId && bannedDevices.includes(deviceId)) return true;

  const bannedIPs = await readBlob('data', 'bannedIPs');
  if (bannedIPs.some(b => b.ip === ip)) return true;

  if (user && user.banned) return true;

  return false;
};

export const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export const response = (body, statusCode = 200) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

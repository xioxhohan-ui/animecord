import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Node 18+ has global fetch, but let's be safe
if (!global.fetch) {
  console.warn('⚠️  Global fetch not found. Geo-data features may fail.');
}

process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL ERROR:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
const PORT = 3001;
const JWT_SECRET = 'animecord-local-secret-2024';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Serve avatar frames as static files
app.use('/src/avatar frame', express.static(path.join(__dirname, 'src', 'avatar frame')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Socket.io Logic ────────────────────────────────────────────────────────
const userSockets = new Map(); // userId -> Set of socketIds

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) { next(new Error('Authentication error')); }
});

io.on('connection', (socket) => {
  const userId = String(socket.userId);
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket.id);

  socket.on('disconnect', () => {
    if (userSockets.has(userId)) {
      const uId = String(userId);
      userSockets.get(uId).delete(socket.id);
      if (userSockets.get(uId).size === 0) userSockets.delete(uId);
    }
  });
});

// ─── File DB ───────────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const FILES = {
  users: path.join(dataDir, 'users.json'),
  servers: path.join(dataDir, 'servers.json'),
  messages: path.join(dataDir, 'messages.json'),
  dms: path.join(dataDir, 'dms.json'),
  bannedUsers: path.join(dataDir, 'bannedUsers.json'),
  bannedIPs: path.join(dataDir, 'bannedIPs.json'),
  bannedDevices: path.join(dataDir, 'bannedDevices.json'),
  moderationLogs: path.join(dataDir, 'moderationLogs.json'),
  typing: path.join(dataDir, 'typing.json'),
};

const readDB = (file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content ? JSON.parse(content) : [];
  } catch (e) {
    console.error(`DB Read Error [${file}]:`, e);
    return [];
  }
};
const writeDB = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

Object.values(FILES).forEach(f => {
  if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify([]));
});

// ─── Seed CEO ─────────────────────────────────────────────────────────────
(async () => {
  const users = readDB(FILES.users);
  if (!users.find(u => u.username === 'ceo')) {
    const hash = await bcrypt.hash('ceo123', 10);
    users.push({
      id: genId(),
      username: 'ceo',
      password_hash: hash,
      role: 'CEO',
      displayName: 'CEO',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=ceo&backgroundColor=b6e3f4',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
      bio: 'Platform CEO — supreme authority.',
      status: 'online',
      lastActive: Date.now(),
      banned: false,
    });
    writeDB(FILES.users, users);
    console.log('[Seed] CEO account created → username: ceo / password: ceo123');
  }
})();


// ─── Middleware ────────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = readDB(FILES.users);
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    // Check if user is banned
    const bannedUsers = readDB(FILES.bannedUsers);
    if (user.banned || bannedUsers.some(b => b.userId === user.id)) {
      return res.status(403).json({ status: 'banned', error: 'You have been permanently banned' });
    }

    // Check if IP is banned
    const ip = getClientIP(req);
    const bannedIPs = readDB(FILES.bannedIPs);
    if (bannedIPs.some(b => b.ip === ip)) {
      return res.status(403).json({ status: 'banned', error: 'Your IP has been permanently banned' });
    }

    // Check if Device is banned
    const deviceId = req.headers['x-device-id'];
    if (deviceId) {
      const bannedDevices = readDB(FILES.bannedDevices);
      if (bannedDevices.some(b => b.deviceId === deviceId)) {
        return res.status(403).json({ status: 'banned', error: 'Your device has been permanently banned' });
      }
    }

    req.user = user;
    // Update lastActive
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx !== -1) { users[idx].lastActive = Date.now(); writeDB(FILES.users, users); }
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const isCEO = (req, res, next) => req.user.role === 'CEO' ? next() : res.status(403).json({ error: 'CEO only' });
const isAdminOrCEO = (req, res, next) => ['CEO', 'ADMIN'].includes(req.user.role) ? next() : res.status(403).json({ error: 'Admin only' });

// ─── Helper: strip password ────────────────────────────────────────────────
const safeUser = (u) => {
  const { password_hash, ...rest } = u;
  const isOnline = (Date.now() - (u.lastActive || 0)) < 30000;
  return { ...rest, isOnline };
};

// ─── IP Helper ────────────────────────────────────────────────────────────
const getClientIP = (req) => {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
};

const fetchGeoData = async (ip) => {
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
    return { country: 'Local', region: 'Local', city: 'Local' };
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    if (!data.error) {
      return {
        country: data.country_name,
        region: data.region, // Jella
        city: data.city, // Upazilla
        isp: data.org
      };
    }
  } catch (e) { console.error('Geo Fetch Error', e); }
  return {};
};

const parseDevice = (ua = '') => {
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
};

// ─── AUTH ──────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { username, password, displayName, deviceId } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const ip = getClientIP(req);
  const bannedIPs = readDB(FILES.bannedIPs);
  if (bannedIPs.some(b => b.ip === ip))
    return res.status(403).json({ error: 'Your IP has been banned from this platform' });

  const bannedUsers = readDB(FILES.bannedUsers);
  if (bannedUsers.some(b => b.username === username.toLowerCase()))
    return res.status(403).json({ error: 'Your account has been permanently banned' });

  const users = readDB(FILES.users);
  
  // Anti-Alt Check
  const alt = users.find(u => u.ipInfo?.ip === ip || (deviceId && u.deviceId === deviceId));
  if (alt) {
    const altsCount = users.filter(u => u.ipInfo?.ip === ip || (deviceId && u.deviceId === deviceId)).length;
    if (altsCount >= 3) return res.status(403).json({ error: 'Maximum accounts reached for this device/IP' });
  }

  if (users.find(u => u.username === username.toLowerCase()))
    return res.status(400).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 10);
  const geo = await fetchGeoData(ip);
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
    riskScore: alt ? 30 : 0,
    deviceId,
    ownedFrames: [],
    coins: 100,
    ipInfo: { 
      ip, 
      device: parseDevice(req.headers['user-agent']), 
      userAgent: req.headers['user-agent'],
      ...geo
    },
  };
  users.push(user);
  writeDB(FILES.users, users);
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, user: safeUser(user) });
});

app.post('/api/login', async (req, res) => {
  const { username, password, deviceId } = req.body;

  const ip = getClientIP(req);
  
  // Check Device Ban
  if (deviceId) {
    const bannedDevices = readDB(FILES.bannedDevices);
    if (bannedDevices.some(b => b.deviceId === deviceId)) {
      return res.status(403).json({ status: 'banned', error: 'This device is permanently banned' });
    }
  }
  const bannedIPs = readDB(FILES.bannedIPs);
  if (bannedIPs.some(b => b.ip === ip))
    return res.status(403).json({ error: 'Your IP has been banned from this platform' });

  const bannedUsers = readDB(FILES.bannedUsers);
  if (bannedUsers.some(b => b.username === username?.toLowerCase()))
    return res.status(403).json({ error: 'Your account has been permanently banned' });

  const users = readDB(FILES.users);
  const user = users.find(u => u.username === username?.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.banned) return res.status(403).json({ error: 'Your account has been permanently banned' });
  if (!(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });

  const geo = await fetchGeoData(ip);
  const uIdx = users.findIndex(u => u.id === user.id);
  users[uIdx].lastActive = Date.now();
  users[uIdx].deviceId = deviceId || users[uIdx].deviceId;
  users[uIdx].ipInfo = { 
    ip, 
    device: parseDevice(req.headers['user-agent']), 
    userAgent: req.headers['user-agent'],
    ...geo
  };
  writeDB(FILES.users, users);
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, user: safeUser(users[uIdx]) });
});

app.post('/api/logout', auth, (req, res) => {
  const userId = String(req.user.id);
  if (userSockets.has(userId)) {
    userSockets.delete(userId);
  }
  res.json({ success: true });
});

app.get('/api/me', auth, (req, res) => {
  const users = readDB(FILES.users);
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ user: safeUser(user) });
});

// ─── USERS ────────────────────────────────────────────────────────────────
app.get('/api/users', auth, (req, res) => {
  const users = readDB(FILES.users);
  res.json(users.map(safeUser));
});

app.patch('/api/users/profile', auth, (req, res) => {
  const { displayName, bio, avatar, banner, status, gender, age } = req.body;
  const users = readDB(FILES.users);
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (displayName !== undefined) users[idx].displayName = displayName;
  if (bio !== undefined) users[idx].bio = bio;
  if (avatar !== undefined) users[idx].avatar = avatar;
  if (banner !== undefined) users[idx].banner = banner;
  if (status !== undefined) users[idx].status = status;
  if (gender !== undefined) users[idx].gender = gender;
  if (age !== undefined) users[idx].age = age;
  writeDB(FILES.users, users);
  res.json({ user: safeUser(users[idx]) });
});

// ─── SERVERS ──────────────────────────────────────────────────────────────
app.get('/api/servers', auth, (req, res) => {
  const servers = readDB(FILES.servers);
  const users = readDB(FILES.users);
  
  // Strict filter: return only servers user is in, OR public servers
  const myServers = servers.filter(s => s.members.some(m => m.userId === req.user.id) || s.isPublic);
  
  const enriched = myServers.map(s => ({
    ...s,
    ownerName: users.find(u => u.id === s.ownerId)?.displayName || 'Unknown',
    memberCount: s.members.length,
  }));

  // CEO sees all; others see only their filtered list
  if (req.user.role === 'CEO') {
    return res.json(servers.map(s => ({
      ...s,
      ownerName: users.find(u => u.id === s.ownerId)?.displayName || 'Unknown',
      memberCount: s.members.length,
    })));
  }
  res.json(enriched);
});

app.post('/api/servers', auth, isAdminOrCEO, (req, res) => {
  const { name, isPublic = true, avatar = '', banner = '', description = '' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const servers = readDB(FILES.servers);
  const server = {
    id: genId(),
    name: name.trim(),
    avatar,
    banner,
    description,
    ownerId: req.user.id,
    members: [{ userId: req.user.id, role: 'owner' }],
    channels: [
      { id: genId(), name: 'general', serverId: '', type: 'text' },
      { id: genId(), name: 'announcements', serverId: '', type: 'text' },
    ],
    isPublic,
    createdAt: Date.now(),
  };
  server.channels.forEach(c => c.serverId = server.id);
  servers.push(server);
  writeDB(FILES.servers, servers);
  const users = readDB(FILES.users);
  res.status(201).json({
    ...server,
    ownerName: users.find(u => u.id === server.ownerId)?.displayName || 'Unknown',
    memberCount: server.members.length,
  });
});

// Edit server profile (CEO or server owner)
app.patch('/api/servers/:id', auth, (req, res) => {
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const server = servers[idx];
  if (req.user.role !== 'CEO' && server.ownerId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden — not your server' });
  const { name, avatar, banner, description } = req.body;
  if (name !== undefined) servers[idx].name = name.trim() || server.name;
  if (avatar !== undefined) servers[idx].avatar = avatar;
  if (banner !== undefined) servers[idx].banner = banner;
  if (description !== undefined) servers[idx].description = description;
  writeDB(FILES.servers, servers);
  const users = readDB(FILES.users);
  res.json({
    ...servers[idx],
    ownerName: users.find(u => u.id === servers[idx].ownerId)?.displayName || 'Unknown',
    memberCount: servers[idx].members.length,
  });
});

app.delete('/api/servers/:id', auth, (req, res) => {
  const servers = readDB(FILES.servers);
  const server = servers.find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'CEO' && server.ownerId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });
  writeDB(FILES.servers, servers.filter(s => s.id !== req.params.id));
  res.json({ success: true });
});

app.post('/api/servers/:id/join', auth, (req, res) => {
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (!servers[idx].members.some(m => m.userId === req.user.id))
    servers[idx].members.push({ userId: req.user.id, role: 'member' });
  writeDB(FILES.servers, servers);
  res.json({ success: true, server: servers[idx] });
});

app.post('/api/join-server', auth, (req, res) => {
  const { inviteCode, serverId, gender, age } = req.body;
  const servers = readDB(FILES.servers);
  let idx = -1;
  
  if (inviteCode) {
    idx = servers.findIndex(s => s.inviteCode === inviteCode);
  } else if (serverId) {
    idx = servers.findIndex(s => s.id === serverId);
  }
  
  if (idx === -1) return res.status(404).json({ error: 'Server or invite not found' });
  
  const users = readDB(FILES.users);
  const uIdx = users.findIndex(u => u.id === req.user.id);
  if (uIdx !== -1) {
    if (gender !== undefined) users[uIdx].gender = gender;
    if (age !== undefined) users[uIdx].age = age;
    writeDB(FILES.users, users);
  }
  
  if (!servers[idx].members.some(m => m.userId === req.user.id)) {
    servers[idx].members.push({ userId: req.user.id, role: 'member' });
    writeDB(FILES.servers, servers);
  }
  
  res.json({ success: true, server: servers[idx], user: safeUser(users[uIdx]) });
});

app.post('/api/servers/:id/leave', auth, (req, res) => {
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  servers[idx].members = servers[idx].members.filter(m => m.userId !== req.user.id);
  writeDB(FILES.servers, servers);
  res.json({ success: true });
});

app.post('/api/invite/create', auth, isAdminOrCEO, (req, res) => {
  const { serverId } = req.body;
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === serverId);
  if (idx === -1) return res.status(404).json({ error: 'Server not found' });
  if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
    return res.status(403).json({ error: 'Not your server' });
    
  if (!servers[idx].inviteCode) {
    servers[idx].inviteCode = genId();
    writeDB(FILES.servers, servers);
  }
  
  res.json({ success: true, inviteCode: servers[idx].inviteCode });
});

app.get('/api/invite/:code', (req, res) => {
  const servers = readDB(FILES.servers);
  const server = servers.find(s => s.inviteCode === req.params.code);
  if (!server) return res.status(404).json({ error: 'Invite not found' });
  res.json({
    id: server.id,
    name: server.name,
    avatar: server.avatar,
    banner: server.banner,
    memberCount: server.members.length
  });
});

app.post('/api/servers/:id/channels', auth, isAdminOrCEO, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Server not found' });
  if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });
  const channel = { id: genId(), name: name.trim(), serverId: req.params.id, type: 'text' };
  servers[idx].channels.push(channel);
  writeDB(FILES.servers, servers);
  res.json(channel);
});

app.delete('/api/servers/:id/channels/:channelId', auth, isAdminOrCEO, (req, res) => {
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Server not found' });
  if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });
  if (servers[idx].channels.length <= 1)
    return res.status(400).json({ error: 'Cannot delete the last channel' });
  servers[idx].channels = servers[idx].channels.filter(c => c.id !== req.params.channelId);
  writeDB(FILES.servers, servers);
  res.json({ success: true });
});

// ─── MESSAGES ─────────────────────────────────────────────────────────────
app.get('/api/messages', auth, (req, res) => {
  const { channelId, limit = 50 } = req.query;
  if (!channelId) return res.status(400).json({ error: 'channelId required' });
  
  const servers = readDB(FILES.servers);
  // Find server containing this channel
  const server = servers.find(s => s.channels.some(c => c.id === channelId));
  if (!server) return res.status(404).json({ error: 'Channel not found' });
  
  // Check membership
  const isMember = server.members.some(m => m.userId === req.user.id);
  if (!isMember && req.user.role !== 'CEO') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const messages = readDB(FILES.messages);
  const users = readDB(FILES.users);
  const filtered = messages
    .filter(m => m.channelId === channelId)
    .slice(-Number(limit))
    .map(m => {
      const sender = users.find(u => u.id === m.senderId);
      return { ...m, senderName: sender?.displayName || 'Unknown', senderAvatar: sender?.avatar || '', senderFrame: sender?.activeFrame || null };
    });
  res.json(filtered);
});

app.post('/api/messages', auth, (req, res) => {
  const { channelId, content, attachments } = req.body;
  const userId = req.user.id;

  // Behavior Tracking: Spam Detection
  const messages = readDB(FILES.messages);
  const userRecent = messages.filter(m => m.senderId === userId && Date.now() - m.timestamp < 5000);
  
  if (userRecent.length >= 10) {
    updateRiskScore(userId, 20, 'Spam detected (>10 msgs in 5s)');
    return res.status(429).json({ error: 'Slow down! Too many messages.' });
  }

  const lastMsg = userRecent[userRecent.length - 1];
  if (lastMsg && lastMsg.content === content) {
    updateRiskScore(userId, 15, 'Repeated message detected');
  }

  if (!channelId || !content?.trim()) return res.status(400).json({ error: 'Missing fields' });
  const users = readDB(FILES.users);
  const sender = users.find(u => u.id === req.user.id);
  const msg = {
    id: genId(),
    channelId,
    senderId: req.user.id,
    senderName: sender?.displayName || req.user.username,
    senderAvatar: sender?.avatar || '',
    senderFrame: sender?.activeFrame || null,
    content: content.trim(),
    attachments: attachments || null,
    reactions: {},
    timestamp: Date.now(),
  };
  messages.push(msg);
  writeDB(FILES.messages, messages);
  res.status(201).json(msg);
});

app.post('/api/messages/:id/react', auth, (req, res) => {
  const { emoji } = req.body;
  const messages = readDB(FILES.messages);
  const idx = messages.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (!messages[idx].reactions) messages[idx].reactions = {};
  if (!messages[idx].reactions[emoji]) messages[idx].reactions[emoji] = [];
  const arr = messages[idx].reactions[emoji];
  const uIdx = arr.indexOf(req.user.id);
  if (uIdx === -1) arr.push(req.user.id); else arr.splice(uIdx, 1);
  writeDB(FILES.messages, messages);
  res.json(messages[idx]);
});

app.delete('/api/messages/:id', auth, (req, res) => {
  const messages = readDB(FILES.messages);
  const msg = messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (msg.senderId !== req.user.id && req.user.role !== 'CEO' && req.user.role !== 'ADMIN')
    return res.status(403).json({ error: 'Forbidden' });
  writeDB(FILES.messages, messages.filter(m => m.id !== req.params.id));
  res.json({ success: true });
});

// ─── UTILS ────────────────────────────────────────────────────────────────
function addModerationLog(actionType, targetId, performedBy, reason) {
  const logs = readDB(FILES.moderationLogs);
  const log = {
    id: genId(),
    actionType,
    targetId,
    performedBy,
    reason,
    timestamp: Date.now()
  };
  logs.unshift(log);
  if (logs.length > 1000) logs.pop();
  writeDB(FILES.moderationLogs, logs);
  io.emit('log-update', log);
  return log;
}

function updateRiskScore(userId, increment, reason) {
  const users = readDB(FILES.users);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  
  users[idx].riskScore = Math.min(100, (users[idx].riskScore || 0) + increment);
  writeDB(FILES.users, users);
  
  addModerationLog('AUTO_DETECTION', userId, 'SYSTEM', `Risk Score +${increment}: ${reason}`);
  
  if (users[idx].riskScore >= 90) {
    // Auto Ban
    performBan(userId, 'SYSTEM', 'Risk score threshold reached (90+)');
  } else if (users[idx].riskScore >= 70) {
    // Auto Mute (Placeholder for now, could add a muted flag)
    users[idx].muted = true;
    writeDB(FILES.users, users);
  }
  
  io.emit('analytics-update');
}

function performBan(targetUserId, performedBy, reason) {
  const users = readDB(FILES.users);
  const idx = users.findIndex(u => u.id === targetUserId);
  if (idx === -1) return;

  const target = users[idx];
  target.banned = true;
  writeDB(FILES.users, users);

  const bannedUsers = readDB(FILES.bannedUsers);
  if (!bannedUsers.some(b => b.userId === target.id)) {
    bannedUsers.push({ userId: target.id, username: target.username, ip: target.ipInfo?.ip, bannedAt: Date.now() });
    writeDB(FILES.bannedUsers, bannedUsers);
  }

  // Purge data
  const messages = readDB(FILES.messages);
  writeDB(FILES.messages, messages.filter(m => m.senderId !== target.id));
  const dms = readDB(FILES.dms);
  writeDB(FILES.dms, dms.filter(m => m.senderId !== target.id && m.receiverId !== target.id));
  const servers = readDB(FILES.servers);
  writeDB(FILES.servers, servers.map(s => ({ ...s, members: s.members.filter(m => m.userId !== target.id) })));

  addModerationLog('USER_BAN', target.id, performedBy, reason);

  // Emit Socket
  if (userSockets.has(String(target.id))) {
    userSockets.get(String(target.id)).forEach(sid => {
      io.to(sid).emit('force-logout', { message: `Account banned: ${reason}` });
    });
  }
}

// ─── DMs ──────────────────────────────────────────────────────────────────
const dmKey = (a, b) => [a, b].sort().join('::');

app.get('/api/dm', auth, (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const key = dmKey(req.user.id, userId);
  const dms = readDB(FILES.dms);
  const users = readDB(FILES.users);
  const filtered = dms
    .filter(m => m.dmKey === key)
    .slice(-100)
    .map(m => {
      const sender = users.find(u => u.id === m.senderId);
      return { ...m, senderName: sender?.displayName || 'Unknown', senderAvatar: sender?.avatar || '', senderFrame: sender?.activeFrame || null };
    });
  res.json(filtered);
});

app.post('/api/dm', auth, (req, res) => {
  const { toUserId, content } = req.body;
  if (!toUserId || !content?.trim()) return res.status(400).json({ error: 'Missing fields' });
  const users = readDB(FILES.users);
  const sender = users.find(u => u.id === req.user.id);
  const msg = {
    id: genId(),
    dmKey: dmKey(req.user.id, toUserId),
    senderId: req.user.id,
    receiverId: toUserId,
    senderName: sender?.displayName || req.user.username,
    senderAvatar: sender?.avatar || '',
    senderFrame: sender?.activeFrame || null,
    content: content.trim(),
    timestamp: Date.now(),
    read: false,
  };
  const dms = readDB(FILES.dms);
  dms.push(msg);
  writeDB(FILES.dms, dms);
  res.status(201).json(msg);
});

app.get('/api/dm/conversations', auth, (req, res) => {
  const dms = readDB(FILES.dms);
  const users = readDB(FILES.users);
  const myDms = dms.filter(m => m.senderId === req.user.id || m.receiverId === req.user.id);
  const seen = new Set();
  const convos = [];
  for (const dm of [...myDms].reverse()) {
    const otherId = dm.senderId === req.user.id ? dm.receiverId : dm.senderId;
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    const other = users.find(u => u.id === otherId);
    const unread = myDms.filter(m => m.senderId === otherId && m.receiverId === req.user.id && !m.read).length;
    convos.push({ userId: otherId, displayName: other?.displayName || 'Unknown', avatar: other?.avatar || '', lastMessage: dm.content, lastTime: dm.timestamp, unread });
  }
  res.json(convos);
});

// ─── CEO ACTIONS ──────────────────────────────────────────────────────────
app.post('/api/ceo-action', auth, isCEO, (req, res) => {
  const { action, payload } = req.body;
  const users = readDB(FILES.users);

  if (action === 'promote_admin') {
    const idx = users.findIndex(u => u.id === payload.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    if (users[idx].role === 'CEO') return res.status(400).json({ error: 'Cannot demote CEO' });
    users[idx].role = 'ADMIN';
    writeDB(FILES.users, users);
    return res.json({ success: true, user: safeUser(users[idx]) });
  }

  if (action === 'demote_user') {
    const idx = users.findIndex(u => u.id === payload.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    if (users[idx].role === 'CEO') return res.status(400).json({ error: 'Cannot demote CEO' });
    users[idx].role = 'USER';
    writeDB(FILES.users, users);
    return res.json({ success: true, user: safeUser(users[idx]) });
  }

  if (action === 'ban') {
    const idx = users.findIndex(u => u.id === payload.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    if (users[idx].role === 'CEO') return res.status(400).json({ error: 'Cannot ban CEO' });
    
    const targetUserId = users[idx].id;
    const targetUsername = users[idx].username;
    const targetIP = users[idx].ipInfo?.ip || '';

    // 1. Add to bannedUsers
    users[idx].banned = true;
    writeDB(FILES.users, users);
    
    const bannedUsers = readDB(FILES.bannedUsers);
    if (!bannedUsers.some(b => b.userId === targetUserId)) {
      bannedUsers.push({
        userId: targetUserId,
        username: targetUsername,
        ip: targetIP,
        bannedAt: Date.now()
      });
      writeDB(FILES.bannedUsers, bannedUsers);
    }

    // 2. DELETE ALL MESSAGES
    const messages = readDB(FILES.messages);
    const remainingMessages = messages.filter(m => m.senderId !== targetUserId);
    writeDB(FILES.messages, remainingMessages);

    // 3. DELETE ALL DM HISTORY
    const dms = readDB(FILES.dms);
    const remainingDms = dms.filter(m => m.senderId !== targetUserId && m.receiverId !== targetUserId);
    writeDB(FILES.dms, remainingDms);

    // 4. REMOVE FROM ALL SERVERS
    const servers = readDB(FILES.servers);
    const updatedServers = servers.map(s => ({
      ...s,
      members: s.members.filter(m => m.userId !== targetUserId)
    }));
    writeDB(FILES.servers, updatedServers);

    // 5. EMIT FORCE LOGOUT (Instant)
    const victimId = String(targetUserId);
    if (userSockets.has(victimId)) {
      userSockets.get(victimId).forEach(sid => {
        io.to(sid).emit('force-logout', { message: 'You have been permanently banned from AnimeCord.' });
      });
    }

    return res.json({ success: true, message: 'User banned and all data purged' });
  }

  if (action === 'unban') {
    const idx = users.findIndex(u => u.id === payload.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    users[idx].banned = false;
    writeDB(FILES.users, users);
    return res.json({ success: true });
  }

  if (action === 'delete_server') {
    const servers = readDB(FILES.servers);
    writeDB(FILES.servers, servers.filter(s => s.id !== payload.serverId));
    return res.json({ success: true });
  }

  if (action === 'broadcast') {
    const servers = readDB(FILES.servers);
    const messages = readDB(FILES.messages);
    const ceo = users.find(u => u.role === 'CEO');
    for (const server of servers) {
      for (const channel of server.channels.filter(c => c.name === 'announcements')) {
        messages.push({
          id: genId(),
          channelId: channel.id,
          senderId: req.user.id,
          senderName: ceo?.displayName || 'CEO',
          senderAvatar: ceo?.avatar || '',
          content: `📢 ${payload.message}`,
          file: null,
          reactions: {},
          timestamp: Date.now(),
          isAnnouncement: true,
        });
      }
    }
    writeDB(FILES.messages, messages);
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Unknown action' });
});

// ─── ADMIN ACTIONS ────────────────────────────────────────────────────────
app.post('/api/admin-action', auth, isAdminOrCEO, (req, res) => {
  const { action, payload } = req.body;
  const servers = readDB(FILES.servers);

  if (action === 'kick') {
    const idx = servers.findIndex(s => s.id === payload.serverId);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });
    if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
      return res.status(403).json({ error: 'Not your server' });
    servers[idx].members = servers[idx].members.filter(m => m.userId !== payload.userId);
    writeDB(FILES.servers, servers);
    return res.json({ success: true });
  }

  if (action === 'transfer_owner') {
    const idx = servers.findIndex(s => s.id === payload.serverId);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });
    if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
      return res.status(403).json({ error: 'Not your server' });
    servers[idx].ownerId = payload.userId;
    // update role of previous owner to admin or member, new owner to 'owner'
    servers[idx].members = servers[idx].members.map(m => {
      if (m.userId === req.user.id) return { ...m, role: 'admin' };
      if (m.userId === payload.userId) return { ...m, role: 'owner' };
      return m;
    });
    // Ensure the new owner is in the members array if not already
    if (!servers[idx].members.some(m => m.userId === payload.userId)) {
      servers[idx].members.push({ userId: payload.userId, role: 'owner' });
    }
    
    writeDB(FILES.servers, servers);
    return res.json({ success: true });
  }

  if (action === 'set_server_role') {
    const idx = servers.findIndex(s => s.id === payload.serverId);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });
    if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
      return res.status(403).json({ error: 'Not your server' });
    servers[idx].members = servers[idx].members.map(m => 
      m.userId === payload.userId ? { ...m, role: payload.role } : m
    );
    writeDB(FILES.servers, servers);
    return res.json({ success: true });
  }

  if (action === 'add_channel') {
    const idx = servers.findIndex(s => s.id === payload.serverId);
    if (idx === -1) return res.status(404).json({ error: 'Server not found' });
    if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
      return res.status(403).json({ error: 'Not your server' });
    const ch = { id: genId(), name: payload.channelName.trim(), serverId: payload.serverId, type: 'text' };
    servers[idx].channels.push(ch);
    writeDB(FILES.servers, servers);
    return res.json({ success: true, channel: ch });
  }

  res.status(400).json({ error: 'Unknown action' });
});

// ─── BAN CHECK (POLLING) ───────────────────────────────────────────────────
app.get('/api/check-ban', auth, (req, res) => {
  // auth middleware already checks, but if they are here, they are not banned
  res.json({ banned: false });
});

// ─── LOGS (CEO) ───────────────────────────────────────────────────────────
app.get('/api/ceo/logs', auth, (req, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
  const logs = readDB(FILES.moderationLogs);
  res.json(logs);
});

// ─── ANALYTICS (CEO) ──────────────────────────────────────────────────────
app.get('/api/ceo/analytics', auth, (req, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Access denied' });
  
  const users = readDB(FILES.users);
  const servers = readDB(FILES.servers);
  const messages = readDB(FILES.messages);
  const banned = readDB(FILES.bannedUsers);
  
  const now = Date.now();
  const messagesLastHour = messages.filter(m => now - m.timestamp < 3600000).length;
  const activeUsers = users.filter(u => now - (u.lastActive || 0) < 600000).length; // Active in last 10m
  
  const analytics = {
    totalUsers: users.length,
    activeUsers,
    totalServers: servers.length,
    totalMessages: messages.length,
    totalBans: banned.length,
    messagesPerMinute: Math.round(messagesLastHour / 60),
    suspiciousUsers: users.filter(u => (u.riskScore || 0) > 50).length
  };
  
  res.json(analytics);
});

app.get('/api/stats', auth, isCEO, (req, res) => {
  const users = readDB(FILES.users);
  const servers = readDB(FILES.servers);
  const messages = readDB(FILES.messages);
  const bannedIPs = readDB(FILES.bannedIPs);
  const now = Date.now();
  res.json({
    totalUsers: users.length,
    totalServers: servers.length,
    totalMessages: messages.length,
    onlineUsers: users.filter(u => (now - (u.lastActive || 0)) < 30000).length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    bannedUsers: users.filter(u => u.banned).length,
    bannedIPs: bannedIPs.length,
  });
});

// ─── IP BAN ───────────────────────────────────────────────────────────────
app.post('/api/ban-ip', auth, isCEO, (req, res) => {
  const { ip, reason, userId } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP required' });
  const bannedIPs = readDB(FILES.bannedIPs);
  if (bannedIPs.some(b => b.ip === ip)) return res.json({ success: true, message: 'Already banned' });
  bannedIPs.push({ ip, bannedAt: Date.now(), bannedBy: req.user.id, reason: reason || '', userId });
  writeDB(FILES.bannedIPs, bannedIPs);
  res.json({ success: true });
});

app.delete('/api/ban-ip/:ip', auth, isCEO, (req, res) => {
  const bannedIPs = readDB(FILES.bannedIPs);
  writeDB(FILES.bannedIPs, bannedIPs.filter(b => b.ip !== req.params.ip));
  res.json({ success: true });
});

app.get('/api/banned-ips', auth, isCEO, (req, res) => {
  res.json(readDB(FILES.bannedIPs));
});

// ─── PASSWORD CHANGE ──────────────────────────────────────────────────────
app.post('/api/password/change', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const users = readDB(FILES.users);
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const ok = await bcrypt.compare(currentPassword, users[idx].password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  users[idx].password_hash = await bcrypt.hash(newPassword, 10);
  writeDB(FILES.users, users);
  res.json({ success: true });
});

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────
app.post('/api/typing', auth, (req, res) => {
  const { channelId, dmUserId } = req.body;
  const typing = readDB(FILES.typing);
  const now = Date.now();
  // Remove stale entries (>4s old)
  const fresh = typing.filter(t => now - t.timestamp < 4000);
  const key = channelId || `dm_${dmUserId}`;
  const idx = fresh.findIndex(t => t.userId === req.user.id && (t.channelId === channelId || t.dmUserId === dmUserId));
  const users = readDB(FILES.users);
  const u = users.find(u => u.id === req.user.id);
  const entry = { userId: req.user.id, userName: u?.displayName || 'Someone', channelId, dmUserId, timestamp: now };
  if (idx === -1) fresh.push(entry); else fresh[idx] = entry;
  writeDB(FILES.typing, fresh);
  res.json({ success: true });
});

app.get('/api/typing', auth, (req, res) => {
  const { channelId, dmUserId } = req.query;
  const typing = readDB(FILES.typing);
  const now = Date.now();
  const fresh = typing.filter(t => now - t.timestamp < 4000 && t.userId !== req.user.id);
  if (channelId) return res.json(fresh.filter(t => t.channelId === channelId));
  if (dmUserId) return res.json(fresh.filter(t => t.dmUserId === dmUserId));
  res.json([]);
});

// ─── FRAMES ───────────────────────────────────────────────────────────────
app.get('/api/frames/list', auth, (req, res) => {
  const framesDir = path.join(__dirname, 'src', 'avatar frame');
  try {
    const files = fs.readdirSync(framesDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    const frames = files.map(f => ({
      id: f.replace(/\.[^.]+$/, '').replace(/Avatar Frame_/, '').replace(/[^a-zA-Z0-9]/g, '_'),
      name: f.replace(/Avatar Frame_/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/\(\d+\)/, '').trim(),
      filename: f,
      price: 10,
    }));
    res.json(frames);
  } catch { res.json([]); }
});

app.patch('/api/frames/equip', auth, (req, res) => {
  const { frameId } = req.body;
  const users = readDB(FILES.users);
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  // CEO can equip any frame for free
  if (users[idx].role !== 'CEO' && !users[idx].ownedFrames?.includes(frameId))
    return res.status(403).json({ error: 'You do not own this frame' });
  users[idx].activeFrame = frameId || null;
  writeDB(FILES.users, users);
  res.json({ user: safeUser(users[idx]) });
});

app.post('/api/frames/gift', auth, isCEO, (req, res) => {
  const { toUserId, frameId, frameName } = req.body;
  const users = readDB(FILES.users);
  const toIdx = users.findIndex(u => u.id === toUserId);
  if (toIdx === -1) return res.status(404).json({ error: 'User not found' });
  
  // Send DM gift card (not claimed yet)
  const sender = users.find(u => u.id === req.user.id);
  const dmKey_ = [req.user.id, toUserId].sort().join('::');
  const dms = readDB(FILES.dms);
  const giftMsg = {
    id: genId(), dmKey: dmKey_, senderId: req.user.id, receiverId: toUserId,
    senderName: sender?.displayName || 'CEO', senderAvatar: sender?.avatar || '',
    content: `🎁 Gifted frame: ${frameName}`,
    timestamp: Date.now(), read: false,
    type: 'frame_gift',
    frameGift: { frameId, frameName, claimed: false },
  };
  dms.push(giftMsg);
  writeDB(FILES.dms, dms);
  res.json({ success: true, message: giftMsg });
});

app.post('/api/frames/buy', auth, (req, res) => {
  const { frameId } = req.body;
  const users = readDB(FILES.users);
  const uIdx = users.findIndex(u => u.id === req.user.id);
  if (uIdx === -1) return res.status(404).json({ error: 'User not found' });
  const user = users[uIdx];
  if (user.coins < 10) return res.status(400).json({ error: 'Not enough coins (10 tk required)' });
  if (user.ownedFrames?.includes(frameId)) return res.status(400).json({ error: 'Already owned' });
  user.coins -= 10;
  if (!user.ownedFrames) user.ownedFrames = [];
  user.ownedFrames.push(frameId);
  user.activeFrame = frameId;
  writeDB(FILES.users, users);
  res.json({ success: true, user: safeUser(user) });
});

app.post('/api/frames/claim', auth, (req, res) => {
  const { messageId, frameId } = req.body;
  const dms = readDB(FILES.dms);
  const mIdx = dms.findIndex(m => m.id === messageId && m.receiverId === req.user.id);
  if (mIdx === -1) return res.status(404).json({ error: 'Gift not found' });
  if (dms[mIdx].frameGift?.claimed) return res.status(400).json({ error: 'Already claimed' });

  const users = readDB(FILES.users);
  const uIdx = users.findIndex(u => u.id === req.user.id);
  if (!users[uIdx].ownedFrames) users[uIdx].ownedFrames = [];
  if (!users[uIdx].ownedFrames.includes(frameId)) {
    users[uIdx].ownedFrames.push(frameId);
  }
  users[uIdx].activeFrame = frameId; // Apply instantly
  writeDB(FILES.users, users);

  dms[mIdx].frameGift.claimed = true;
  writeDB(FILES.dms, dms);

  res.json({ success: true, user: safeUser(users[uIdx]) });
});

// ─── SERVER BAN (ban from specific server) ────────────────────────────────
app.post('/api/servers/:id/ban', auth, isAdminOrCEO, (req, res) => {
  const { userId } = req.body;
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'CEO' && servers[idx].ownerId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });
  if (!servers[idx].bannedMembers) servers[idx].bannedMembers = [];
  if (!servers[idx].bannedMembers.includes(userId)) servers[idx].bannedMembers.push(userId);
  servers[idx].members = servers[idx].members.filter(m => m.userId !== userId);
  writeDB(FILES.servers, servers);
  res.json({ success: true });
});

app.delete('/api/servers/:id/ban/:userId', auth, isAdminOrCEO, (req, res) => {
  const servers = readDB(FILES.servers);
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (!servers[idx].bannedMembers) servers[idx].bannedMembers = [];
  servers[idx].bannedMembers = servers[idx].bannedMembers.filter(id => id !== req.params.userId);
  writeDB(FILES.servers, servers);
  res.json({ success: true });
});

// Patch join to check server ban
app.post('/api/join-server-check', auth, (req, res) => {
  const { inviteCode } = req.body;
  const servers = readDB(FILES.servers);
  const server = servers.find(s => s.inviteCode === inviteCode);
  if (!server) return res.status(404).json({ error: 'Invite not found' });
  if (server.bannedMembers?.includes(req.user.id))
    return res.status(403).json({ error: 'You are banned from this server' });
  res.json({ ok: true, server: { id: server.id, name: server.name } });
});

// ─── DM READ/MARK ─────────────────────────────────────────────────────────
app.post('/api/dm/mark-read', auth, (req, res) => {
  const { fromUserId } = req.body;
  const dms = readDB(FILES.dms);
  const key = [req.user.id, fromUserId].sort().join('::');
  let changed = false;
  dms.forEach(m => {
    if (m.dmKey === key && m.receiverId === req.user.id && !m.read) {
      m.read = true; changed = true;
    }
  });
  if (changed) writeDB(FILES.dms, dms);
  res.json({ success: true });
});

// ─── Start Server ─────────────────────────────────────────────────────────
httpServer.listen(PORT, () => console.log(`\n🚀 AnimeCord API → http://localhost:${PORT}\n`));

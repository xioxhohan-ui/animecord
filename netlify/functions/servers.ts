import { getStore } from '@netlify/blobs';
import { extractUserFromHeader } from './utils/auth';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const handler = async (event: any) => {
  const user = extractUserFromHeader(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  try {
    const store = getStore('animecord_servers');

    if (event.httpMethod === 'GET') {
      const { blobs } = await store.list();
      const servers = [];
      for (const blob of blobs) {
        const data = await store.get(blob.key, { type: 'json' });
        if (data) servers.push(data);
      }
      // If empty, return a default mock server for testing
      if (servers.length === 0) {
        const defaultServer = {
          id: generateId(),
          name: 'Global Anime Lounge',
          ownerId: 'system',
          members: [],
          channels: [{ id: generateId(), name: 'general', serverId: 'sys' }]
        };
        await store.setJSON(defaultServer.id, defaultServer);
        servers.push(defaultServer);
      }
      return { statusCode: 200, body: JSON.stringify(servers) };
    }

    if (event.httpMethod === 'POST') {
      if (user.role !== 'ADMIN' && user.role !== 'CEO') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
      }

      const { name } = JSON.parse(event.body);
      const newServer = {
        id: generateId(),
        name,
        ownerId: user.id,
        members: [ownerId],
        channels: [{ id: generateId(), name: 'general', serverId: 'tbd' }]
      };
      newServer.channels[0].serverId = newServer.id;
      
      await store.setJSON(newServer.id, newServer);
      return { statusCode: 200, body: JSON.stringify(newServer) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (error) {
    console.error(error);
    // Fallback for local development if Netlify Blobs fails (e.g. CLI not linked)
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        body: JSON.stringify([
          {
            id: 'mock-1',
            name: 'Local Dev Server (Fallback)',
            ownerId: 'admin',
            members: [],
            channels: [{ id: 'chan-1', name: 'general', serverId: 'mock-1' }]
          }
        ])
      };
    }
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

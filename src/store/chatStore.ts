import { create } from 'zustand';
import { useAuthStore } from './authStore';
import type { Server, Message, DmMessage, DmConversation, User, Stats } from '../types';

const API = '/api';
const getToken = () => localStorage.getItem('animecord_token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

interface ChatState {
  servers: Server[];
  users: User[];
  messages: Message[];
  dms: DmMessage[];
  dmConversations: DmConversation[];
  stats: Stats | null;
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDmUserId: string | null;
  isLoading: boolean;

  fetchServers: () => Promise<void>;
  createServer: (name: string) => Promise<Server | null>;
  joinServerWithData: (data: { inviteCode?: string, serverId?: string, gender: string, age: string }) => Promise<void>;
  createInvite: (serverId: string) => Promise<string | null>;
  leaveServer: (serverId: string) => Promise<void>;
  setActiveServer: (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  fetchMessages: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, senderId: string, content: string, senderName: string, senderAvatar: string) => Promise<void>;
  setActiveDmUser: (userId: string | null) => void;
  fetchDms: (userId: string) => Promise<void>;
  sendDm: (toUserId: string, content: string) => Promise<void>;
  fetchDmConversations: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchStats: () => Promise<void>;
  ceoAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
  adminAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
  editServer: (serverId: string, updates: Record<string, unknown>) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  transferOwnership: (serverId: string, newOwnerId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  claimFrame: (messageId: string, frameId: string) => Promise<void>;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  servers: [],
  users: [],
  messages: [],
  dms: [],
  dmConversations: [],
  stats: null,
  activeServerId: null,
  activeChannelId: null,
  activeDmUserId: null,
  isLoading: false,

  fetchServers: async () => {
    try {
      const res = await fetch(`${API}/getServers`, { headers: authHeaders() });
      if (res.ok) set({ servers: await res.json() });
    } catch (e) { console.error('fetchServers', e); }
  },

  createServer: async (name) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'create', payload: { name } }),
      });
      if (res.ok) {
        const server = await res.json();
        set(state => ({ servers: [...state.servers, server] }));
        return server;
      }
    } catch (e) { console.error('createServer', e); }
    return null;
  },

  joinServerWithData: async (data) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'join', payload: data })
      });
      if (res.ok) {
        await get().fetchServers();
        useAuthStore.getState().fetchMe();
      }
    } catch (e) { console.error('joinServerWithData', e); }
  },

  createInvite: async (serverId) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'create_invite', payload: { serverId } })
      });
      if (res.ok) {
        const data = await res.json();
        return data.inviteCode;
      }
      return null;
    } catch (e) {
      console.error('createInvite', e);
      return null;
    }
  },

  leaveServer: async (serverId) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'leave', payload: { serverId } }),
      });
      if (res.ok) get().fetchServers();
    } catch (e) { console.error('leaveServer', e); }
  },

  setActiveServer: (id) => {
    set({ activeServerId: id, activeDmUserId: null });
    if (!id) { set({ activeChannelId: null }); return; }
    const server = get().servers.find(s => s.id === id);
    if (server?.channels?.length) get().setActiveChannel(server.channels[0].id);
    else set({ activeChannelId: null });
  },

  setActiveChannel: (id) => {
    set({ activeChannelId: id, activeDmUserId: null });
    if (id) get().fetchMessages(id);
  },

  fetchMessages: async (channelId) => {
    try {
      const res = await fetch(`${API}/getMessages?channelId=${channelId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ messages: data });
      }
    } catch (e) { console.error('fetchMessages', e); }
  },

  sendMessage: async (channelId, senderId, content, senderName, senderAvatar) => {
    const optimistic: Message = {
      id: 'tmp-' + Date.now(),
      channelId,
      senderId,
      senderName,
      senderAvatar,
      content,
      timestamp: Date.now(),
      reactions: {},
      file: null
    };
    set(state => ({ messages: [...state.messages, optimistic] }));
    try {
      const res = await fetch(`${API}/sendMessage`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ channelId, content }),
      });
      if (res.ok) {
        const msg = await res.json();
        set(state => ({
          messages: state.messages.map(m => m.id === optimistic.id ? msg : m),
        }));
      }
    } catch (e) { console.error('sendMessage', e); }
  },

  setActiveDmUser: (userId) => {
    set({ activeDmUserId: userId, activeServerId: null, activeChannelId: null });
    if (userId) get().fetchDms(userId);
  },

  fetchDms: async (userId) => {
    try {
      const res = await fetch(`${API}/dmAction?action=get_messages&otherUserId=${userId}`, { headers: authHeaders() });
      if (res.ok) set({ dms: await res.json() });
    } catch (e) { console.error('fetchDms', e); }
  },

  sendDm: async (toUserId, content) => {
    try {
      const res = await fetch(`${API}/dmAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'send', payload: { toUserId, content } }),
      });
      if (res.ok) {
        const msg = await res.json();
        set(state => ({ dms: [...state.dms, msg] }));
        get().fetchDmConversations();
      }
    } catch (e) { console.error('sendDm', e); }
  },

  fetchDmConversations: async () => {
    try {
      const res = await fetch(`${API}/dmAction?action=get_conversations`, { headers: authHeaders() });
      if (res.ok) set({ dmConversations: await res.json() });
    } catch (e) { console.error('fetchDmConversations', e); }
  },

  fetchUsers: async () => {
    try {
      const res = await fetch(`${API}/getUsers`, { headers: authHeaders() });
      if (res.ok) set({ users: await res.json() });
    } catch (e) { console.error('fetchUsers', e); }
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`${API}/analytics`, { headers: authHeaders() });
      if (res.ok) set({ stats: await res.json() });
    } catch (e) { console.error('fetchStats', e); }
  },

  ceoAction: async (action, payload) => {
    try {
      const res = await fetch(`${API}/ceoAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        await Promise.all([get().fetchServers(), get().fetchStats(), get().fetchUsers()]);
      }
    } catch (e) { console.error('ceoAction', e); }
  },

  adminAction: async (action, payload) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) await get().fetchServers();
    } catch (e) { console.error('adminAction', e); }
  },

  editServer: async (serverId, updates) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'edit', payload: { serverId, ...updates } }),
      });
      if (res.ok) await get().fetchServers();
    } catch (e) { console.error('editServer', e); }
  },

  deleteServer: async (serverId) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'delete', payload: { serverId } }),
      });
      if (res.ok) {
        await get().fetchServers();
        if (get().activeServerId === serverId) get().setActiveServer(null);
      }
    } catch (e) { console.error('deleteServer', e); }
  },

  transferOwnership: async (serverId, newOwnerId) => {
    try {
      const res = await fetch(`${API}/serverAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'transfer_owner', payload: { serverId, userId: newOwnerId } }),
      });
      if (res.ok) await get().fetchServers();
    } catch (e) { console.error('transferOwnership', e); }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await fetch(`${API}/sendMessage`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'react', payload: { messageId, emoji } }),
      });
      if (res.ok) {
        const updated = await res.json();
        set(state => ({
          messages: state.messages.map(m => m.id === messageId ? updated : m),
        }));
      }
    } catch (e) { console.error('reactToMessage', e); }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await fetch(`${API}/sendMessage`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'delete', payload: { messageId } }),
      });
      if (res.ok) set(state => ({ messages: state.messages.filter(m => m.id !== messageId) }));
    } catch (e) { console.error('deleteMessage', e); }
  },

  claimFrame: async (messageId, frameId) => {
    try {
      const res = await fetch(`${API}/frameAction`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'claim', payload: { messageId, frameId } }),
      });
      if (res.ok) {
        await useAuthStore.getState().refreshUser();
      }
    } catch (e) { console.error('claimFrame', e); }
  },

  reset: () => {
    set({
      servers: [], users: [], messages: [], dms: [], dmConversations: [], stats: null,
      activeServerId: null, activeChannelId: null, activeDmUserId: null
    });
  },
}));

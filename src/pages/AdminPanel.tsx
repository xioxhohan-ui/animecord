import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useUiStore } from '../store/uiStore';
import { Shield, Plus, Users, Trash2, Hash, Settings } from 'lucide-react';
import type { Server } from '../types';
import FramedAvatar from '../components/ui/FramedAvatar';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const { servers, fetchServers, createServer, deleteServer, adminAction, deleteChannel } = useChatStore();
  const { addToast, openCreateServerModal, openEditServerModal, openConfirmModal } = useUiStore();
  const [newChannelName, setNewChannelName] = useState('');
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);

  useEffect(() => { fetchServers(); }, []);

  const myServers = servers.filter(s => s.ownerId === user?.id);

  const handleAddChannel = async (e: React.FormEvent, serverId: string) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    await adminAction('add_channel', { serverId, channelName: newChannelName.trim() });
    addToast(`Channel #${newChannelName} added!`, 'success');
    setNewChannelName('');
  };

  const handleKick = async (serverId: string, userId: string, userName: string) => {
    await adminAction('kick', { serverId, userId });
    addToast(`${userName} kicked from server`, 'info');
  };

  return (
    <div className="flex-1 w-full min-w-0 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Shield className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage your servers and moderate members</p>
            </div>
          </div>
          <button
            onClick={openCreateServerModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] transition-all btn-glow"
          >
            <Plus className="w-4 h-4" /> Create Server
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-4 border border-white/5">
            <p className="text-xs text-muted-foreground mb-1">My Servers</p>
            <p className="text-3xl font-bold text-white">{myServers.length}</p>
          </div>
          <div className="glass-panel rounded-2xl p-4 border border-white/5">
            <p className="text-xs text-muted-foreground mb-1">Total Members</p>
            <p className="text-3xl font-bold text-white">{myServers.reduce((a, s) => a + s.members.length, 0)}</p>
          </div>
          <div className="glass-panel rounded-2xl p-4 border border-white/5">
            <p className="text-xs text-muted-foreground mb-1">Total Channels</p>
            <p className="text-3xl font-bold text-white">{myServers.reduce((a, s) => a + s.channels.length, 0)}</p>
          </div>
        </div>

        {/* My Servers */}
        {myServers.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center border border-white/5">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-semibold text-white mb-2">No servers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first server to start moderating.</p>
            <button
              onClick={openCreateServerModal}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold rounded-xl transition-all btn-glow"
            >
              Create Server
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myServers.map(server => (
              <ServerCard
                key={server.id}
                server={server}
                isSelected={selectedServer?.id === server.id}
                onSelect={() => setSelectedServer(prev => prev?.id === server.id ? null : server)}
                onDelete={() => {
                  openConfirmModal(
                    'Delete Server',
                    `Are you sure you want to permanently delete "${server.name}"?`,
                    async () => {
                      await deleteServer(server.id);
                      addToast(`Server "${server.name}" deleted`, 'info');
                    }
                  );
                }}
                onEdit={() => openEditServerModal(server.id)}
                onKick={handleKick}
                onAddChannel={handleAddChannel}
                onDeleteChannel={async (serverId, channelId) => {
                  await deleteChannel(serverId, channelId);
                  addToast('Channel deleted', 'info');
                }}
                newChannelName={newChannelName}
                setNewChannelName={setNewChannelName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServerCard({ server, isSelected, onSelect, onDelete, onEdit, onKick, onAddChannel, onDeleteChannel, newChannelName, setNewChannelName }: {
  server: Server;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onKick: (serverId: string, userId: string, userName: string) => void;
  onAddChannel: (e: React.FormEvent, serverId: string) => void;
  onDeleteChannel: (serverId: string, channelId: string) => void;
  newChannelName: string;
  setNewChannelName: (v: string) => void;
}) {
  const { users } = useChatStore();
  const members = server.members.map(m => users.find(u => u.id === m.userId)).filter(Boolean) as import('../types').User[];

  return (
    <motion.div
      layout
      className="glass-panel rounded-2xl border border-white/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/3 transition-colors" onClick={onSelect}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary">
            {server.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white">{server.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Users className="w-3 h-3" />{server.members.length} members
              <span>·</span>
              <Hash className="w-3 h-3" />{server.channels.length} channels
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const { createInvite } = useChatStore.getState();
              const { addToast } = useUiStore.getState();
              const code = await createInvite(server.id);
              if (code) {
                const link = `${window.location.origin}/invite/${code}`;
                navigator.clipboard.writeText(link);
                addToast('Invite link copied to clipboard!', 'success');
              } else {
                addToast('Failed to create invite', 'error');
              }
            }}
            className="p-2 text-green-400/80 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
            title="Copy Invite Link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-2 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Edit server"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className={`w-5 h-5 rounded-full border border-white/20 flex items-center justify-center transition-transform ${isSelected ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
      </div>

      {/* Expanded */}
      {isSelected && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="border-t border-white/5"
        >
          <div className="p-5 grid md:grid-cols-2 gap-6">
            {/* Members */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Members</h4>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <FramedAvatar src={m.avatar} activeFrame={m.activeFrame} size={28} className="border border-white/10" />
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[hsl(222,47%,8%)] ${m.isOnline ? 'status-online' : 'status-offline'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{m.displayName}</p>
                        <p className="text-[10px] text-muted-foreground">{m.role}</p>
                      </div>
                    </div>
                    {m.role !== 'CEO' && (
                      <button
                        onClick={() => onKick(server.id, m.id, m.displayName)}
                        className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500 hover:text-white transition-all"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Channels + Add */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Channels</h4>
              <div className="space-y-1 mb-4">
                {server.channels.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-muted-foreground group">
                    <Hash className="w-3 h-3 flex-shrink-0" />
                    <span className="flex-1 truncate">{c.name}</span>
                    {server.channels.length > 1 && (
                      <button
                        onClick={() => onDeleteChannel(server.id, c.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                        title="Delete channel"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={e => onAddChannel(e, server.id)} className="flex gap-2">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="new-channel"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold hover:bg-primary hover:text-white transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

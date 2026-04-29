import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { useUiStore } from '../store/uiStore';
import {
  Crown, Users, Server as ServerIcon, Activity,
  Trash2, Shield, UserX, UserCheck, Megaphone, RefreshCw, Settings
} from 'lucide-react';
import type { User, Server } from '../types';
import FramedAvatar from '../components/ui/FramedAvatar';

export default function CeoDashboard() {
  const { users, servers, stats, fetchUsers, fetchServers, fetchStats, ceoAction, deleteServer } = useChatStore();
  const { addToast, openEditServerModal, openConfirmModal } = useUiStore();
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [tab, setTab] = useState<'users' | 'servers' | 'ips'>('users');
  const [loading, setLoading] = useState<string | null>(null);
  const [bannedIPs, setBannedIPs] = useState<Array<{ip: string; bannedAt: number; reason?: string; userId?: string}>>([]);
  const [banningIP, setBanningIP] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchServers();
    fetchStats();
  }, []);

  const doAction = async (action: string, payload: Record<string, unknown>, successMsg: string) => {
    setLoading(action + JSON.stringify(payload));
    await ceoAction(action, payload);
    addToast(successMsg, 'success');
    setLoading(null);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    await doAction('broadcast', { message: broadcastMsg.trim() }, 'Broadcast sent to all servers!');
    setBroadcastMsg('');
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? users.length, icon: Users, color: 'from-violet-600/30 to-violet-600/10 border-violet-500/20', iconColor: 'text-violet-400' },
    { label: 'Active Servers', value: stats?.totalServers ?? servers.length, icon: ServerIcon, color: 'from-blue-600/30 to-blue-600/10 border-blue-500/20', iconColor: 'text-blue-400' },
    { label: 'Online Now', value: stats?.onlineUsers ?? 0, icon: Activity, color: 'from-green-600/30 to-green-600/10 border-green-500/20', iconColor: 'text-green-400' },
    { label: 'Banned IPs', value: (stats as Record<string, number> | undefined)?.bannedIPs ?? bannedIPs.length, icon: Crown, color: 'from-red-600/30 to-red-600/10 border-red-500/20', iconColor: 'text-red-400' },
  ];

  const fetchBannedIPs = async () => {
    try {
      const r = await fetch('/api/banned-ips', { headers: { Authorization: `Bearer ${localStorage.getItem('animecord_token')||''}` } });
      const data = await r.json();
      setBannedIPs(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { if (tab === 'ips') fetchBannedIPs(); }, [tab]);

  const handleBanIP = async (ip: string, userId?: string) => {
    setBanningIP(ip);
    try {
      await fetch('/api/ban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('animecord_token')||''}` },
        body: JSON.stringify({ ip, userId }),
      });
      addToast(`IP ${ip} banned!`, 'success');
      fetchBannedIPs();
    } catch { addToast('Failed to ban IP', 'error'); }
    setBanningIP(null);
  };

  const handleUnbanIP = async (ip: string) => {
    try {
      await fetch(`/api/ban-ip/${encodeURIComponent(ip)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('animecord_token')||''}` },
      });
      addToast(`IP ${ip} unbanned`, 'success');
      fetchBannedIPs();
    } catch {}
  };

  return (
    <div className="flex-1 w-full min-w-0 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Crown className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">CEO Dashboard</h1>
              <p className="text-sm text-muted-foreground">Global platform control & analytics</p>
            </div>
          </div>
          <button
            onClick={() => { fetchUsers(); fetchServers(); fetchStats(); addToast('Refreshed!', 'info'); }}
            className="flex items-center gap-2 glass-panel-light border border-white/10 text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`glass-panel rounded-2xl p-5 border bg-gradient-to-br ${card.color} relative overflow-hidden group hover:scale-[1.02] transition-transform`}
            >
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/5 group-hover:scale-110 transition-transform" />
              <card.icon className={`w-5 h-5 ${card.iconColor} mb-3`} />
              <div className="text-3xl font-bold text-white">{card.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Broadcast */}
        <div className="glass-panel rounded-2xl p-5 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-white">Global Broadcast</h2>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              placeholder="Type your announcement for all servers..."
              onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-500/40 placeholder:text-muted-foreground"
            />
            <button
              onClick={handleBroadcast}
              disabled={!broadcastMsg.trim()}
              className="px-5 py-2.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl font-semibold text-sm hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-40"
            >
              Broadcast
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['users', 'servers', 'ips'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-primary text-white' : 'glass-panel-light text-muted-foreground hover:text-white'}`}>
              {t === 'ips' ? '🚫 Banned IPs' : t === 'users' ? `Users (${users.length})` : `Servers (${servers.length})`}
            </button>
          ))}
        </div>

        {/* Users table */}
        {tab === 'users' && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP / Device</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role !== 'CEO').map(u => (
                    <UserRow
                      key={u.id}
                      user={u}
                      loading={loading}
                      onPromote={() => doAction('promote_admin', { userId: u.id }, `${u.displayName} promoted to Admin`)}
                      onDemote={() => doAction('demote_user', { userId: u.id }, `${u.displayName} demoted to User`)}
                      onBan={() => doAction('ban', { userId: u.id }, `${u.displayName} banned`)}
                      onUnban={() => doAction('unban', { userId: u.id }, `${u.displayName} unbanned`)}
                      onBanIP={() => u.ipInfo?.ip && handleBanIP(u.ipInfo.ip, u.id)}
                      banningIP={banningIP}
                    />
                  ))}
                </tbody>
              </table>
              {users.filter(u => u.role !== 'CEO').length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">No users registered yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Servers table */}
        {tab === 'servers' && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Server</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Members</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {servers.map(s => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-white">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{s.ownerName || s.ownerId.slice(0, 8)}</td>
                      <td className="px-5 py-4 text-sm text-white">{s.memberCount || s.members.length}</td>
                      <td className="px-5 py-4 text-sm text-white">{s.channels.length}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const { createInvite } = useChatStore.getState();
                              const code = await createInvite(s.id);
                              if (code) {
                                const link = `${window.location.origin}/invite/${code}`;
                                navigator.clipboard.writeText(link);
                                addToast('Invite link copied!', 'success');
                              } else {
                                addToast('Failed to create invite', 'error');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-lg text-xs font-semibold transition-all border border-green-500/20"
                            title="Copy Invite Link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            Invite
                          </button>
                          <button
                            onClick={() => openEditServerModal(s.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-semibold transition-all border border-primary/20"
                          >
                            <Settings className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => openConfirmModal(
                              'Delete Server',
                              `Are you sure you want to completely delete "${s.name}"? This action cannot be undone.`,
                              async () => {
                                await deleteServer(s.id);
                                addToast(`Server "${s.name}" deleted`, 'info');
                              }
                            )}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-semibold transition-all border border-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {servers.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">No servers created yet.</p>
              )}
            </div>
          </div>
        )}
        {/* IP Bans table */}
        {tab === 'ips' && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Banned IPs ({bannedIPs.length})</span>
              <button onClick={fetchBannedIPs} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP Address</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banned At</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {bannedIPs.map(b => (
                    <tr key={b.ip} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3 font-mono text-sm text-red-400">{b.ip}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(b.bannedAt).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleUnbanIP(b.ip)}
                          className="px-3 py-1 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500 hover:text-white transition-all">
                          Unban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bannedIPs.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No IPs banned.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, loading, onPromote, onDemote, onBan, onUnban, onBanIP, banningIP }: {
  user: User;
  loading: string | null;
  onPromote: () => void;
  onDemote: () => void;
  onBan: () => void;
  onUnban: () => void;
  onBanIP: () => void;
  banningIP: string | null;
}) {
  const roleColors = { ADMIN: 'text-blue-400 bg-blue-500/20 border-blue-500/30', USER: 'text-violet-400 bg-violet-500/20 border-violet-500/30' };
  const ip = (user as User & { ipInfo?: { ip?: string; device?: string } }).ipInfo?.ip;
  const device = (user as User & { ipInfo?: { ip?: string; device?: string } }).ipInfo?.device;

  return (
    <tr className={`border-b border-white/5 hover:bg-white/3 transition-colors ${user.banned ? 'opacity-50' : ''}`}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <FramedAvatar src={user.avatar} activeFrame={user.activeFrame} size={36} className="border border-white/10" />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[hsl(222,47%,8%)] ${user.isOnline ? 'status-online' : 'status-offline'}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{user.displayName}</div>
            <div className="text-xs text-muted-foreground">@{user.username}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${(roleColors as Record<string, string>)[user.role] || 'text-muted-foreground bg-white/5 border-white/10'}`}>
          {user.role}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-muted-foreground">{ip || 'N/A'}</div>
          <div className="text-[10px] text-muted-foreground/60">{device ? `📱 ${device}` : ''}</div>
        </div>
      </td>
      <td className="px-5 py-3">
        {user.banned ? (
          <span className="text-xs text-red-400 font-semibold">🚫 Banned</span>
        ) : (
          <span className={`text-xs font-semibold ${user.isOnline ? 'text-green-400' : 'text-muted-foreground'}`}>
            {user.isOnline ? '🟢 Online' : '⚫ Offline'}
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {user.role === 'USER' && !user.banned && (
            <ActionBtn onClick={onPromote} icon={<Shield className="w-3 h-3" />} label="Promote" color="blue" />
          )}
          {user.role === 'ADMIN' && (
            <ActionBtn onClick={onDemote} icon={<UserX className="w-3 h-3" />} label="Demote" color="yellow" />
          )}
          {!user.banned ? (
            <ActionBtn onClick={onBan} icon={<UserX className="w-3 h-3" />} label="Ban" color="red" />
          ) : (
            <ActionBtn onClick={onUnban} icon={<UserCheck className="w-3 h-3" />} label="Unban" color="green" />
          )}
          {ip && (
            <ActionBtn onClick={onBanIP} icon={<span className="text-[10px]">🌐</span>} label={banningIP === ip ? '...' : 'Ban IP'} color="red" />
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ onClick, icon, label, color }: { onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
  const c = { blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white', red: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white', yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500 hover:text-black', green: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500 hover:text-white' }[color] || '';
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${c}`}>
      {icon}{label}
    </button>
  );
}

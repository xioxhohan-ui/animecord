import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useUiStore } from '../../store/uiStore';
import { useContextMenuStore } from '../ui/ContextMenu';
import { useRealtime } from '../../hooks/useRealtime';
import {
  LogOut, Settings, Shield, Crown, MessageSquare,
  Plus, X, Users, Home, Hash, Link2, Trash2, Edit, ShoppingBag
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FramedAvatar from '../ui/FramedAvatar';

function StatusDot({ status }: { status: string }) {
  const cls = { online: 'status-online', idle: 'status-idle', dnd: 'status-dnd', offline: 'status-offline' }[status] || 'status-offline';
  return <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[hsl(222,47%,8%)] z-20 ${cls}`} />;
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { servers, activeServerId, dmConversations, setActiveServer, setActiveDmUser, activeDmUserId, createInvite, deleteServer } = useChatStore();
  const { openProfileModal, openCreateServerModal, openEditServerModal, isMobileSidebarOpen, closeMobileSidebar, toggleMobileSidebar, addToast, openConfirmModal } = useUiStore();
  const { showMenu } = useContextMenuStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'servers' | 'dms'>('servers');

  useRealtime();

  if (!user) return null;

  const totalUnread = dmConversations.reduce((sum, c) => sum + c.unread, 0);

  const handleServerIconRightClick = (e: React.MouseEvent, server: import('../../types').Server) => {
    e.preventDefault();
    e.stopPropagation();
    const items = [
      {
        label: 'Open Server',
        icon: <MessageSquare className="w-4 h-4" />,
        onClick: () => { setActiveServer(server.id); navigate(`/server/${server.id}`); closeMobileSidebar(); },
      },
    ];
    if (user.role === 'CEO' || server.ownerId === user.id) {
      items.push({
        label: 'Edit Server',
        icon: <Edit className="w-4 h-4" />,
        onClick: () => openEditServerModal(server.id),
      });
    }
    items.push({
      label: 'Copy Invite Link',
      icon: <Link2 className="w-4 h-4" />,
      onClick: async () => {
        const code = await createInvite(server.id);
        if (code) { navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`); addToast('Invite link copied!', 'success'); }
        else addToast('Failed to create invite', 'error');
      },
    });
    if (user.role === 'CEO') {
      items.push({
        label: 'Delete Server',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => openConfirmModal('Delete Server', `Delete "${server.name}"? This cannot be undone.`, async () => {
          await deleteServer(server.id);
          addToast(`"${server.name}" deleted`, 'info');
          navigate('/home');
        }),
        danger: true,
      });
    }
    showMenu(items, e.clientX, e.clientY);
  };

  const sidebarContent = (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Icon Rail ── */}
      <div className="w-[68px] h-full bg-black/60 flex flex-col items-center py-3 gap-1.5 border-r border-white/5 flex-shrink-0 overflow-y-auto scrollbar-none">
        {/* Logo */}
        <Link to="/home" className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] mb-1 flex-shrink-0 hover:scale-105 transition-transform">
          <MessageSquare className="w-5 h-5 text-white" />
        </Link>

        <div className="w-8 h-[1px] bg-white/10 my-0.5" />

        {servers.map(server => {
          const isActive = location.pathname === `/server/${server.id}` || activeServerId === server.id;
          return (
            <button
              key={server.id}
              onClick={() => { setActiveServer(server.id); navigate(`/server/${server.id}`); closeMobileSidebar(); }}
              onContextMenu={e => handleServerIconRightClick(e, server)}
              title={server.name}
              className={`relative w-11 h-11 overflow-hidden flex items-center justify-center text-white font-bold text-sm transition-all duration-150 cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'rounded-[14px] bg-primary shadow-[0_0_12px_rgba(139,92,246,0.5)] ring-2 ring-primary'
                  : 'rounded-full hover:rounded-[14px] bg-white/10 hover:bg-primary'
              }`}
            >
              {server.avatar ? (
                <img src={server.avatar} alt={server.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="select-none">{server.name.charAt(0).toUpperCase()}</span>
              )}
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
              )}
            </button>
          );
        })}

        {(user.role === 'ADMIN' || user.role === 'CEO') && (
          <button
            onClick={openCreateServerModal}
            title="Create Server"
            className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-dashed border-white/20 text-green-400 hover:bg-green-500 hover:text-white hover:border-transparent transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1" />

        {/* Nav links */}
        <Link to="/home" title="Home" className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all flex-shrink-0 ${location.pathname === '/home' ? 'bg-primary text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-white/5 text-muted-foreground hover:bg-primary hover:text-white'}`}>
          <Home className="w-[22px] h-[22px]" />
        </Link>
        <Link to="/shop" title="Frame Shop" className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all flex-shrink-0 ${location.pathname === '/shop' ? 'bg-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5 text-muted-foreground hover:bg-yellow-500 hover:text-white'}`}>
          <ShoppingBag className="w-[22px] h-[22px]" />
        </Link>
        {(user.role === 'ADMIN' || user.role === 'CEO') && (
          <Link to="/admin" title="Admin Panel" className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all flex-shrink-0 ${location.pathname === '/admin' ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/5 text-muted-foreground hover:bg-blue-500 hover:text-white'}`}>
            <Shield className="w-[22px] h-[22px]" />
          </Link>
        )}
        {user.role === 'CEO' && (
          <Link to="/ceo" title="CEO Dashboard" className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all flex-shrink-0 ${location.pathname === '/ceo' ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-white/5 text-orange-400 hover:bg-orange-500 hover:text-white'}`}>
            <Crown className="w-[22px] h-[22px]" />
          </Link>
        )}

      </div>

      {/* ── Channel / DM Panel ── */}
      <div className="flex-1 flex flex-col bg-[hsl(222,47%,7%)] min-w-0">
        {/* Header */}
        <div className="h-13 flex items-center px-3 border-b border-white/5 flex-shrink-0 pt-1">
          <div className="flex gap-1 bg-black/30 rounded-lg p-1 w-full">
            <button
              onClick={() => setTab('servers')}
              className={`flex-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${tab === 'servers' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              Servers
            </button>
            <button
              onClick={() => setTab('dms')}
              className={`relative flex-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${tab === 'dms' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              DMs
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {tab === 'servers' ? (
            <div>
              {servers.length === 0 && (
                <p className="text-center text-xs text-muted-foreground mt-8 px-4">
                  No servers yet.{(user.role === 'ADMIN' || user.role === 'CEO') && ' Click + to create one.'}
                </p>
              )}
              {servers.map(server => (
                <ServerItem key={server.id} server={server} onClose={closeMobileSidebar} />
              ))}
            </div>
          ) : (
            <div>
              {dmConversations.length === 0 && (
                <p className="text-center text-xs text-muted-foreground mt-8 px-4">No DMs yet. Click a user to message them.</p>
              )}
              {dmConversations.map(c => (
                <button
                  key={c.userId}
                  onClick={() => { setActiveDmUser(c.userId); navigate(`/dm/${c.userId}`); closeMobileSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-lg transition-colors ${
                    location.pathname === `/dm/${c.userId}` ? 'bg-primary/20 text-white' : 'hover:bg-white/5 text-muted-foreground hover:text-white'
                  }`}
                >
                  <FramedAvatar src={c.avatar} activeFrame={users.find(u => u.id === c.userId)?.activeFrame} size={32} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-xs font-semibold truncate">{c.displayName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.lastMessage}</div>
                  </div>
                  {c.unread > 0 && (
                    <span className="w-5 h-5 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold flex-shrink-0">
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="p-2.5 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group" onClick={openProfileModal}>
            <div className="relative flex-shrink-0">
              <FramedAvatar src={user.avatar} activeFrame={user.activeFrame} size={32} className="border border-white/10" />
              <StatusDot status={user.status || 'online'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
              <div className="text-[10px] text-primary truncate">@{user.username}</div>
            </div>
            <Settings className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          <button
            onClick={logout}
            className="mt-1 w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Mobile avatar/hamburger toggle button ─── */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 rounded-full overflow-hidden border-2 border-primary/60 shadow-lg hover:border-primary transition-all"
        onClick={toggleMobileSidebar}
        title={isMobileSidebarOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileSidebarOpen ? (
          <div className="w-full h-full bg-[hsl(222,47%,10%)] flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </div>
        ) : (
          <FramedAvatar src={user.avatar} activeFrame={user.activeFrame} size={40} className="w-full h-full" />
        )}
      </button>

      {/* ─── Desktop sidebar ─── */}
      <div className="hidden lg:flex w-[330px] h-full flex-shrink-0 overflow-hidden">
        {sidebarContent}
      </div>

      {/* ─── Mobile sidebar overlay (CSS transition, no framer-motion) ─── */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" onClick={closeMobileSidebar} />
          {/* Sidebar panel */}
          <div className="absolute left-0 top-0 h-full w-[330px] flex overflow-hidden shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

function ServerItem({ server, onClose }: { server: import('../../types').Server; onClose: () => void }) {
  const { activeServerId, activeChannelId, setActiveServer, setActiveChannel } = useChatStore();
  const { showMenu } = useContextMenuStore();
  const { openEditServerModal, openConfirmModal, addToast } = useUiStore();
  const { createInvite, deleteServer } = useChatStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = location.pathname === `/server/${server.id}` || activeServerId === server.id;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    const items: import('../ui/ContextMenu').ContextMenuItem[] = [
      {
        label: 'Open Server',
        icon: <MessageSquare className="w-4 h-4" />,
        onClick: () => { setActiveServer(server.id); navigate(`/server/${server.id}`); onClose(); },
      },
    ];
    if (user.role === 'CEO' || server.ownerId === user.id) {
      items.push({ label: 'Edit Server', icon: <Edit className="w-4 h-4" />, onClick: () => openEditServerModal(server.id) });
    }
    items.push({
      label: 'Copy Invite Link',
      icon: <Link2 className="w-4 h-4" />,
      onClick: async () => {
        const code = await createInvite(server.id);
        if (code) { navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`); addToast('Copied!', 'success'); }
      },
    });
    if (user.role === 'CEO') {
      items.push({
        label: 'Delete Server',
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        onClick: () => openConfirmModal('Delete Server', `Delete "${server.name}"?`, async () => {
          await deleteServer(server.id);
          addToast(`"${server.name}" deleted`, 'info');
          navigate('/home');
        }),
      });
    }
    showMenu(items, e.clientX, e.clientY);
  };

  return (
    <div className="mb-0.5">
      <button
        onClick={() => { setActiveServer(server.id); navigate(`/server/${server.id}`); onClose(); }}
        onContextMenu={handleContextMenu}
        className={`w-full flex items-center gap-2 px-3 py-2 mx-1 rounded-lg transition-all text-left ${
          isActive ? 'bg-primary/20 text-white' : 'text-muted-foreground hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? 'bg-primary' : 'bg-white/10'}`}>
          {server.avatar
            ? <img src={server.avatar} alt="" className="w-full h-full object-cover rounded-md" />
            : server.name.charAt(0).toUpperCase()
          }
        </div>
        <span className="text-xs font-semibold truncate flex-1">{server.name}</span>
        <span className="text-[10px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
          <Users className="w-3 h-3" />{server.memberCount || server.members.length}
        </span>
      </button>

      {/* Channels — plain CSS, no framer-motion */}
      {isActive && (
        <div className="overflow-hidden">
          {server.channels?.map(channel => (
            <button
              key={channel.id}
              onClick={() => { setActiveChannel(channel.id); onClose(); }}
              className={`w-full flex items-center gap-1.5 px-4 py-1.5 ml-3 text-[11px] rounded-md transition-colors ${
                activeChannelId === channel.id
                  ? 'text-white bg-white/10'
                  : 'text-muted-foreground hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Hash className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

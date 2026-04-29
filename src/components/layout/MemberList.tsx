import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useContextMenuStore } from '../ui/ContextMenu';
import { Users, Crown, Shield, MessageSquare, UserX, Copy, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types';
import FramedAvatar from '../ui/FramedAvatar';

export default function MemberList() {
  const { servers, activeServerId, users } = useChatStore();
  const { user: me } = useAuthStore();
  const { openUserProfileModal, isMemberListOpen, toggleMemberList, addToast, openConfirmModal } = useUiStore();
  const { showMenu } = useContextMenuStore();
  const { ceoAction, adminAction, setActiveDmUser } = useChatStore();
  const navigate = useNavigate();

  const activeServer = servers.find(s => s.id === activeServerId);
  if (!activeServer) return null;

  const members = activeServer.members
    .map(m => {
      const u = users.find(u => u.id === m.userId);
      return u ? { user: u, serverRole: m.role } : null;
    })
    .filter(Boolean) as { user: User; serverRole: string }[];

  const online = members.filter(m => m.user.isOnline);
  const offline = members.filter(m => !m.user.isOnline);

  const handleCtx = (e: React.MouseEvent, member: User) => {
    e.preventDefault();
    if (!me || me.id === member.id) return;
    const isCEO = me.role === 'CEO';
    const isAdmin = me.role === 'ADMIN';
    const isOwner = activeServer.ownerId === me.id;
    const items: import('../ui/ContextMenu').ContextMenuItem[] = [
      { label: 'View Profile', icon: <Shield className="w-4 h-4" />, onClick: () => openUserProfileModal(member.id) },
      { label: 'Send DM', icon: <MessageSquare className="w-4 h-4" />, onClick: () => { setActiveDmUser(member.id); navigate(`/dm/${member.id}`); } },
      { label: 'Copy Username', icon: <Copy className="w-4 h-4" />, onClick: () => { navigator.clipboard.writeText(`@${member.username}`); addToast('Copied!', 'info'); } },
    ];
    if ((isCEO || (isAdmin && isOwner)) && member.role !== 'CEO')
      items.push({ label: 'Kick', icon: <UserX className="w-4 h-4" />, divider: true, danger: true,
        onClick: () => openConfirmModal('Kick', `Kick ${member.displayName}?`, async () => { await adminAction('kick', { serverId: activeServerId!, userId: member.id }); addToast(`${member.displayName} kicked`, 'success'); }) });
    if (isCEO && member.role !== 'CEO')
      items.push({ label: 'Ban', icon: <Shield className="w-4 h-4" />, danger: true,
        onClick: () => openConfirmModal('Ban', `Ban ${member.displayName}?`, async () => { await ceoAction('ban', { userId: member.id }); addToast(`${member.displayName} banned`, 'success'); }) });
    showMenu(items, e.clientX, e.clientY);
  };

  const panelBody = (
    <div className="flex-1 overflow-y-auto py-3 px-2">
      {online.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Online — {online.length}
          </p>
          {online.map(m => (
            <MemberItem key={m.user.id} member={m.user} serverRole={m.serverRole}
              isMe={m.user.id === me?.id}
              onClick={() => openUserProfileModal(m.user.id)}
              onContextMenu={e => handleCtx(e, m.user)} />
          ))}
        </>
      )}
      {offline.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" /> Offline — {offline.length}
          </p>
          {offline.map(m => (
            <MemberItem key={m.user.id} member={m.user} serverRole={m.serverRole}
              isMe={m.user.id === me?.id}
              onClick={() => openUserProfileModal(m.user.id)}
              onContextMenu={e => handleCtx(e, m.user)} />
          ))}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP (xl+): always inline, no overlap ── */}
      <aside className="hidden xl:flex flex-col w-52 flex-shrink-0 h-full bg-[hsl(222,47%,7%)] border-l border-white/5">
        <div className="h-12 flex items-center px-3 border-b border-white/5 flex-shrink-0">
          <Users className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Members — {members.length}
          </span>
        </div>
        {panelBody}
      </aside>

      {/* ── MOBILE/TABLET: overlay triggered by toggle button ── */}
      {isMemberListOpen && (
        <div className="xl:hidden fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={toggleMemberList} />
          {/* Panel */}
          <aside className="relative w-52 h-full bg-[hsl(222,47%,7%)] border-l border-white/5 flex flex-col shadow-2xl">
            <div className="h-12 flex items-center justify-between px-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Members — {members.length}
                </span>
              </div>
              <button onClick={toggleMemberList} className="p-1 text-muted-foreground hover:text-white transition-colors rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            {panelBody}
          </aside>
        </div>
      )}
    </>
  );
}

function MemberItem({ member, serverRole, isMe, onClick, onContextMenu }: {
  member: User; serverRole: string; isMe: boolean;
  onClick: () => void; onContextMenu: (e: React.MouseEvent) => void;
}) {
  const isOnline = member.isOnline;
  const dotColor = !isOnline ? 'bg-gray-500'
    : member.status === 'idle' ? 'bg-yellow-400'
    : member.status === 'dnd' ? 'bg-red-500'
    : 'bg-green-500';

  return (
    <button onClick={onClick} onContextMenu={onContextMenu}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors ${!isOnline ? 'opacity-50' : ''}`}>
      <div className="relative flex-shrink-0">
        <FramedAvatar
          src={member.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.id}`}
          activeFrame={member.activeFrame}
          size={36}
          className="border border-white/10"
        />
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[hsl(222,47%,7%)] z-20 ${dotColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium truncate ${isOnline ? 'text-white' : 'text-muted-foreground'}`}>
          {member.displayName}{isMe && <span className="text-primary ml-1 text-[10px]">(you)</span>}
        </div>
        <div className="flex items-center gap-0.5 mt-0.5">
          {serverRole === 'owner' && <Crown className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0" />}
          {member.role === 'CEO' && <Shield className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0" />}
          <span className="text-[9px] text-muted-foreground truncate capitalize">{serverRole}</span>
        </div>
      </div>
    </button>
  );
}

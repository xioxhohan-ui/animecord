import { motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, Shield, UserX, Crown, ArrowUpCircle, Key, ExternalLink } from 'lucide-react';
import FramedAvatar from '../ui/FramedAvatar';

const STATUS_LABEL: Record<string, string> = {
  online: '🟢 Online', idle: '🟡 Idle', dnd: '🔴 Do Not Disturb', offline: '⚫ Offline',
};

const ROLE_STYLE: Record<string, string> = {
  CEO: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  ADMIN: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  USER: 'text-violet-400 bg-violet-500/20 border-violet-500/30',
  owner: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  member: 'text-gray-400 bg-white/10 border-white/20',
};

export default function UserProfileModal() {
  const { closeUserProfileModal, viewingUserId, addToast, openConfirmModal } = useUiStore();
  const { users, servers, activeServerId, ceoAction, adminAction, setActiveDmUser, transferOwnership } = useChatStore();
  const { user: me } = useAuthStore();
  const navigate = useNavigate();

  const target = users.find(u => u.id === viewingUserId);
  if (!target || !me) return null;

  const isSelf = me.id === target.id;
  const isCEO = me.role === 'CEO';
  const isAdmin = me.role === 'ADMIN';
  const targetIsCEO = target.role === 'CEO';
  const activeServer = servers.find(s => s.id === activeServerId);
  const isMyServer = activeServer?.ownerId === me.id;
  const serverMember = activeServer?.members.find(m => m.userId === target.id);
  const targetInMyServer = !!serverMember;
  const canModerate = !isSelf && !targetIsCEO && (isCEO || (isAdmin && isMyServer && targetInMyServer && target.role === 'USER'));
  const canTransferOwner = !isSelf && targetInMyServer && (isCEO || isMyServer);

  const handleBan = () => openConfirmModal('Ban User', `Ban ${target.displayName} from the platform?`, async () => {
    await ceoAction('ban', { userId: target.id });
    addToast(`${target.displayName} banned`, 'success');
    closeUserProfileModal();
  });

  const handleKick = () => {
    if (!activeServerId) return;
    openConfirmModal('Kick from Server', `Kick ${target.displayName}?`, async () => {
      await adminAction('kick', { serverId: activeServerId, userId: target.id });
      addToast(`${target.displayName} kicked`, 'success');
      closeUserProfileModal();
    });
  };

  const handlePromote = () => openConfirmModal('Promote to Admin', `Make ${target.displayName} a global Admin?`, async () => {
    await ceoAction('promote_admin', { userId: target.id });
    addToast(`${target.displayName} promoted`, 'success');
    closeUserProfileModal();
  });

  const handleTransfer = () => {
    if (!activeServerId) return;
    openConfirmModal('Transfer Ownership', `Transfer ${activeServer?.name} to ${target.displayName}?`, async () => {
      await transferOwnership(activeServerId, target.id);
      addToast('Ownership transferred', 'success');
      closeUserProfileModal();
    });
  };

  const handleDm = () => {
    setActiveDmUser(target.id);
    navigate(`/dm/${target.id}`);
    closeUserProfileModal();
  };

  const handleViewFullProfile = () => {
    navigate(`/profile/${target.id}`);
    closeUserProfileModal();
  };

  const statusClass = { online: 'status-online', idle: 'status-idle', dnd: 'status-dnd', offline: 'status-offline' }[target.status] || 'status-offline';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeUserProfileModal(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full sm:max-w-md glass-panel rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* Banner */}
        <div className="relative h-40">
          {target.banner ? (
            <img src={target.banner} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-700/60 to-blue-700/60" />
          )}
          <button
            onClick={closeUserProfileModal}
            className="absolute top-3 right-3 w-7 h-7 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-16 mb-4">
            <div className="relative">
              <FramedAvatar
                src={target.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${target.id}`}
                activeFrame={target.activeFrame}
                size={120}
                className="border-4 border-[hsl(222,47%,8%)]"
              />
              <span className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-[hsl(222,47%,8%)] z-20 ${statusClass}`} />
            </div>

            <div className="flex flex-col items-end gap-1 mt-2">
              <div className="flex items-center gap-1.5">
                {target.role === 'CEO' && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_STYLE[target.role] || ''}`}>
                  {target.role}
                </span>
              </div>
              {serverMember && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_STYLE[serverMember.role] || ''}`}>
                  Server {serverMember.role.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Name */}
          <h3 className="text-xl font-bold text-white">{target.displayName}</h3>
          <p className="text-sm text-muted-foreground mb-0.5">@{target.username}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {STATUS_LABEL[target.status] || STATUS_LABEL.offline}
            {target.isOnline && <span className="ml-2 text-green-400">• Active now</span>}
          </p>

          {/* Bio & Details */}
          <div className="mb-3 space-y-2">
            {target.bio && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">About Me</p>
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{target.bio}</p>
              </div>
            )}

            {(target.gender || target.age) && (
              <div className="flex items-center gap-2">
                {target.gender && (
                  <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 flex-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Gender</p>
                    <p className="text-sm text-gray-200">{target.gender}</p>
                  </div>
                )}
                {target.age && (
                  <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 flex-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Age</p>
                    <p className="text-sm text-gray-200">{target.age}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-white/10 mb-3" />

          {/* Actions */}
          <div className="space-y-2">
            {!isSelf && (
              <>
                <button
                  onClick={handleDm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] transition-all btn-glow text-sm"
                >
                  <MessageSquare className="w-4 h-4" /> Send Message
                </button>
                <button
                  onClick={handleViewFullProfile}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl text-sm font-semibold transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> View Full Profile
                </button>
              </>
            )}

            {canTransferOwner && (
              <button onClick={handleTransfer} className="w-full flex items-center justify-center gap-2 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-xl text-sm font-semibold transition-all">
                <Key className="w-4 h-4" /> Transfer Ownership
              </button>
            )}

            {isCEO && target.role === 'USER' && (
              <button onClick={handlePromote} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-xl text-sm font-semibold transition-all">
                <ArrowUpCircle className="w-4 h-4" /> Promote to Admin
              </button>
            )}

            {canModerate && (
              <button onClick={handleKick} className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/20 rounded-xl text-sm font-semibold transition-all">
                <UserX className="w-4 h-4" /> Kick from Server
              </button>
            )}

            {isCEO && !isSelf && !targetIsCEO && (
              <button onClick={handleBan} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-sm font-semibold transition-all">
                <Shield className="w-4 h-4" /> Ban User
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MessageSquare, Shield, UserX, Crown,
  ArrowUpCircle, Key, Calendar, User
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  online: '🟢 Online',
  idle: '🟡 Idle',
  dnd: '🔴 Do Not Disturb',
  offline: '⚫ Offline',
};

const ROLE_STYLE: Record<string, string> = {
  CEO: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  ADMIN: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  USER: 'text-violet-400 bg-violet-500/20 border-violet-500/30',
};

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users, servers, activeServerId, ceoAction, adminAction, transferOwnership } = useChatStore();
  const { user: me } = useAuthStore();
  const { addToast, openConfirmModal } = useUiStore();

  const target = users.find(u => u.id === userId);
  if (!target || !me) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>User not found</p>
        </div>
      </div>
    );
  }

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

  const statusClass = { online: 'status-online', idle: 'status-idle', dnd: 'status-dnd', offline: 'status-offline' }[target.status] || 'status-offline';

  const handleDm = () => navigate(`/dm/${target.id}`);

  const handleBan = () => openConfirmModal('Ban User', `Ban ${target.displayName} from the platform?`, async () => {
    await ceoAction('ban', { userId: target.id });
    addToast(`${target.displayName} banned`, 'success');
    navigate(-1);
  });

  const handleKick = () => {
    if (!activeServerId) return;
    openConfirmModal('Kick from Server', `Kick ${target.displayName} from ${activeServer?.name}?`, async () => {
      await adminAction('kick', { serverId: activeServerId, userId: target.id });
      addToast(`${target.displayName} kicked`, 'success');
    });
  };

  const handlePromote = () => openConfirmModal('Promote to Admin', `Make ${target.displayName} a global Admin?`, async () => {
    await ceoAction('promote_admin', { userId: target.id });
    addToast(`${target.displayName} promoted`, 'success');
  });

  const handleTransfer = () => {
    if (!activeServerId) return;
    openConfirmModal('Transfer Ownership', `Transfer server to ${target.displayName}?`, async () => {
      await transferOwnership(activeServerId, target.id);
      addToast('Ownership transferred', 'success');
    });
  };

  return (
    <motion.div
      key={userId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 w-full min-w-0 overflow-y-auto"
    >
      {/* Banner */}
      <div className="relative h-48 flex-shrink-0">
        {target.banner ? (
          <img src={target.banner} alt="banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-700/60 via-blue-700/40 to-indigo-900/60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(222,47%,6%)]" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl text-sm text-white/80 hover:text-white border border-white/10 hover:bg-black/60 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-12">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-16 mb-5">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-[hsl(222,47%,6%)] overflow-hidden bg-[hsl(222,47%,10%)] shadow-2xl">
              {target.avatar ? (
                <img src={target.avatar} alt={target.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-4xl font-bold text-white">
                  {target.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-3 border-[hsl(222,47%,6%)] ${statusClass}`} />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1 ${ROLE_STYLE[target.role] || ''}`}>
              {target.role === 'CEO' && <Crown className="w-3 h-3" />}
              {target.role}
            </span>
            {serverMember && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full border text-muted-foreground bg-white/5 border-white/10">
                Server {serverMember.role.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <h1 className="text-3xl font-bold text-white mb-1">{target.displayName}</h1>
        <p className="text-primary mb-1">@{target.username}</p>
        <p className="text-sm text-muted-foreground mb-6">{STATUS_LABEL[target.status] || STATUS_LABEL.offline}</p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* About */}
          {target.bio && (
            <div className="glass-panel rounded-2xl p-5 border border-white/5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About Me</p>
              <p className="text-sm text-gray-300 leading-relaxed">{target.bio}</p>
            </div>
          )}

          {/* Details */}
          <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
            {target.gender && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Gender:</span>
                <span className="text-white">{target.gender}</span>
              </div>
            )}
            {target.age && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Age:</span>
                <span className="text-white">{target.age}</span>
              </div>
            )}
            {!target.gender && !target.age && (
              <p className="text-sm text-muted-foreground/60 italic">No details set</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {!isSelf && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDm}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all btn-glow"
            >
              <MessageSquare className="w-4 h-4" /> Send Message
            </motion.button>
          )}

          {canTransferOwner && (
            <button onClick={handleTransfer} className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-xl text-sm font-semibold transition-all">
              <Key className="w-4 h-4" /> Transfer Server Ownership
            </button>
          )}

          {isCEO && target.role === 'USER' && (
            <button onClick={handlePromote} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-xl text-sm font-semibold transition-all">
              <ArrowUpCircle className="w-4 h-4" /> Promote to Global Admin
            </button>
          )}

          {canModerate && (
            <button onClick={handleKick} className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/20 rounded-xl text-sm font-semibold transition-all">
              <UserX className="w-4 h-4" /> Kick from Server
            </button>
          )}

          {isCEO && !isSelf && !targetIsCEO && (
            <button onClick={handleBan} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-sm font-semibold transition-all">
              <Shield className="w-4 h-4" /> Ban User (Platform)
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

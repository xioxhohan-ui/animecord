import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useContextMenuStore } from '../ui/ContextMenu';
import { Send, Smile, Hash, Users, Trash2, Settings, Copy, CornerUpLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { Message } from '../../types';
import FramedAvatar from '../ui/FramedAvatar';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✅', '🎉'];
const EMOJI_PICKER = ['😀','😂','😍','😎','🥺','😭','🔥','✨','💀','🎉','❤️','👍','👋','🤔','😡','🥳','💯','🤝','🫡','🙏'];

export default function ChatArea({
  channelId, serverName, channelName,
}: {
  channelId: string;
  serverName?: string;
  channelName?: string;
}) {
  const { messages, fetchMessages, sendMessage, reactToMessage, deleteMessage, activeServerId, servers } = useChatStore();
  const { user } = useAuthStore();
  const { toggleMemberList, addToast, openEditServerModal, openUserProfileModal } = useUiStore();
  const { showMenu } = useContextMenuStore();
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [showReactPicker, setShowReactPicker] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollTypingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const API_HDR = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('animecord_token') || ''}` });

  const broadcastTyping = () => {
    fetch('/.netlify/functions/typingAction', { method: 'POST', headers: API_HDR(), body: JSON.stringify({ channelId }) }).catch(() => {});
  };

  const activeServer = servers.find(s => s.id === activeServerId);
  const canEditServer = user?.role === 'CEO' || activeServer?.ownerId === user?.id;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { fetchMessages(channelId); }, [channelId]);
  useEffect(() => { scrollToBottom(); }, [messages.length]);

  // Poll remote typing users
  useEffect(() => {
    pollTypingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/.netlify/functions/typingAction?channelId=${channelId}`, { headers: API_HDR() });
        const data = await r.json();
        setRemoteTyping(Array.isArray(data) ? data.map((t: { userName: string }) => t.userName) : []);
      } catch {}
    }, 1500);
    return () => { if (pollTypingRef.current) clearInterval(pollTypingRef.current); };
  }, [channelId, API_HDR]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (content) { setIsTyping(true); timer = setTimeout(() => setIsTyping(false), 2000); }
    else setIsTyping(false);
    return () => clearTimeout(timer);
  }, [content]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    const txt = replyTo ? `> @${replyTo.senderName}: ${replyTo.content}\n${content.trim()}` : content.trim();
    setContent('');
    setShowEmoji(false);
    setReplyTo(null);
    await sendMessage(channelId, user.id, txt, user.displayName, user.avatar);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e as unknown as React.FormEvent);
    if (e.key === 'Escape') setReplyTo(null);
  };

  const handleMsgContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    const canDelete = msg.senderId === user?.id || user?.role === 'CEO' || user?.role === 'ADMIN';
    const items: import('../ui/ContextMenu').ContextMenuItem[] = [
      {
        label: 'Reply',
        icon: <CornerUpLeft className="w-4 h-4" />,
        onClick: () => { setReplyTo(msg); inputRef.current?.focus(); },
      },
      {
        label: 'Copy Message',
        icon: <Copy className="w-4 h-4" />,
        onClick: () => { navigator.clipboard.writeText(msg.content); addToast('Message copied!', 'info'); },
      },
    ];
    if (canDelete) {
      items.push({
        label: 'Delete Message',
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        divider: true,
        onClick: async () => { await deleteMessage(msg.id); addToast('Message deleted', 'info'); },
      });
    }
    showMenu(items, e.clientX, e.clientY);
  };

  const channelMessages = messages.filter(m => m.channelId === channelId);

  return (
    <div className="flex flex-col h-full w-full flex-1 min-w-0 bg-[hsl(222,47%,6%)] relative overflow-hidden">

      {/* ── Server Banner ── */}
      {activeServer?.banner && (
        <div className="relative h-20 flex-shrink-0 overflow-hidden">
          <img src={activeServer.banner} alt="Server banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[hsl(222,47%,6%)]" />
          <div className="absolute bottom-2 left-5 flex items-center gap-2">
            {activeServer.avatar && (
              <img src={activeServer.avatar} alt={activeServer.name} className="w-7 h-7 rounded-lg object-cover border border-white/20" />
            )}
            <span className="text-white font-bold text-sm drop-shadow">{activeServer.name}</span>
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="h-14 flex items-center px-4 border-b border-white/5 bg-[hsl(222,47%,6%)] z-10 flex-shrink-0">
        <Hash className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
        <h3 className="font-semibold text-white truncate">{channelName || 'general'}</h3>
        {serverName && !activeServer?.banner && (
          <span className="ml-3 text-sm text-muted-foreground border-l border-white/10 pl-3 truncate hidden sm:block">
            {serverName}
          </span>
        )}
        <div className="flex-1" />

        {canEditServer && activeServerId && (
          <button
            onClick={() => openEditServerModal(activeServerId)}
            className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
            title="Edit server"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={toggleMemberList}
          className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
          title="Toggle member list"
        >
          <Users className="w-4 h-4" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {channelMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Hash className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-semibold text-white">Welcome to #{channelName || 'general'}</p>
            <p className="text-sm mt-1">This is the beginning of this channel. Say hi! 👋</p>
          </div>
        )}

        {channelMessages.map((msg, idx) => {
            const isMe = msg.senderId === user?.id;
            const prevMsg = channelMessages[idx - 1];
            const isGrouped = prevMsg &&
              prevMsg.senderId === msg.senderId &&
              msg.timestamp - prevMsg.timestamp < 5 * 60 * 1000;

            return (
              <div key={msg.id} className="msg-in">
              <MessageRow
                msg={msg}
                isMe={isMe}
                isGrouped={!!isGrouped}
                hovered={hoveredMsg === msg.id}
                showReactPicker={showReactPicker === msg.id}
                onHover={setHoveredMsg}
                onReact={emoji => { reactToMessage(msg.id, emoji); setShowReactPicker(null); }}
                onToggleReactPicker={id => setShowReactPicker(prev => prev === id ? null : id)}
                onDelete={async () => { await deleteMessage(msg.id); addToast('Deleted', 'info'); }}
                canDelete={isMe || user?.role === 'CEO' || user?.role === 'ADMIN'}
                onContextMenu={e => handleMsgContextMenu(e, msg)}
                onAvatarClick={() => openUserProfileModal(msg.senderId)}
              />
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Typing Indicator ── */}
      {(isTyping || remoteTyping.length > 0) && (
        <div className="px-5 pb-1 text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
          {remoteTyping.length > 0
            ? `${remoteTyping.join(', ')} ${remoteTyping.length === 1 ? 'is' : 'are'} typing...`
            : 'You are typing...'}
        </div>
      )}

      {/* ── Reply Preview ── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2"
          >
            <CornerUpLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-primary font-semibold">Replying to @{replyTo.senderName}</span>
              <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-white transition-colors">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <div className="p-3 border-t border-white/5 bg-black/10 flex-shrink-0">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-[hsl(222,47%,10%)] border border-white/10 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/40 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={e => { setContent(e.target.value); if (e.target.value) broadcastTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `Reply to @${replyTo.senderName}...` : `Message #${channelName || 'general'}`}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-muted-foreground"
          />

          {/* Emoji picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji(v => !v)}
              className="p-1.5 text-muted-foreground hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10"
            >
              <Smile className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-10 right-0 glass-panel rounded-2xl p-3 grid grid-cols-5 gap-1.5 shadow-2xl z-20"
                >
                  {EMOJI_PICKER.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setContent(c => c + e); setShowEmoji(false); inputRef.current?.focus(); }}
                      className="text-lg hover:scale-125 transition-transform"
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={!content.trim()}
            className="p-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl hover:shadow-[0_0_12px_rgba(139,92,246,0.5)] disabled:opacity-30 transition-all transform hover:scale-105 active:scale-95 btn-glow"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {showEmoji && <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />}
    </div>
  );
}

// ── Message Row ──────────────────────────────────────────────────────────────
const MessageRow = React.memo(({
  msg, isGrouped, hovered, showReactPicker,
  onHover, onReact, onToggleReactPicker, onDelete, canDelete, onContextMenu, onAvatarClick,
}: {
  msg: Message;
  isMe: boolean;
  isGrouped: boolean;
  hovered: boolean;
  showReactPicker: boolean;
  onHover: (id: string | null) => void;
  onReact: (emoji: string) => void;
  onToggleReactPicker: (id: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onAvatarClick: () => void;
}) => {
  const hasReactions = Object.values(msg.reactions || {}).some(arr => arr.length > 0);
  const isReply = msg.content.startsWith('> @');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`group relative flex gap-3 px-2 py-0.5 rounded-xl transition-colors hover:bg-white/[0.03] ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
      onMouseEnter={() => onHover(msg.id)}
      onMouseLeave={() => onHover(null)}
      onContextMenu={onContextMenu}
    >
      {/* Avatar */}
      <div className="w-10 flex-shrink-0 mt-0.5">
        {!isGrouped ? (
          <button onClick={onAvatarClick} className="hover:opacity-80 transition-opacity">
            <FramedAvatar
              src={msg.senderAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.senderId}`}
              activeFrame={msg.senderFrame}
              size={40}
              className="border border-white/10"
            />
          </button>
        ) : (
          <span className="block w-10 h-5 text-[10px] text-muted-foreground text-right pr-1 leading-5 opacity-0 group-hover:opacity-100 transition-opacity">
            {msg.timestamp ? format(new Date(msg.timestamp), 'h:mm') : ''}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <button onClick={onAvatarClick} className="font-semibold text-sm text-white hover:underline">
              {msg.senderName}
            </button>
            <span className="text-[10px] text-muted-foreground">
              {msg.timestamp ? format(new Date(msg.timestamp), 'h:mm a') : ''}
            </span>
            {msg.isAnnouncement && (
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-semibold">📢 Announcement</span>
            )}
          </div>
        )}

        {/* Reply quote */}
        {isReply && (() => {
          const lines = msg.content.split('\n');
          const quoteLine = lines[0].replace('> ', '');
          const rest = lines.slice(1).join('\n');
          return (
            <>
              <div className="mb-1 pl-2 border-l-2 border-white/20 text-xs text-muted-foreground italic truncate">{quoteLine}</div>
              <p className={`text-sm leading-relaxed break-words ${msg.isAnnouncement ? 'text-yellow-300 font-medium' : 'text-gray-300'}`}>{rest}</p>
            </>
          );
        })()}

        {!isReply && (
          <p className={`text-sm leading-relaxed break-words ${msg.isAnnouncement ? 'text-yellow-300 font-medium' : 'text-gray-300'}`}>
            {msg.content}
          </p>
        )}

        {/* Reactions */}
        {hasReactions && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(msg.reactions).map(([emoji, uids]) =>
              uids.length > 0 ? (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className="flex items-center gap-1 bg-white/10 hover:bg-primary/20 border border-white/10 hover:border-primary/40 rounded-full px-2 py-0.5 text-xs transition-all"
                >
                  <span>{emoji}</span>
                  <span className="text-white/70">{uids.length}</span>
                </button>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Hover action bar */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="absolute right-2 top-0 -translate-y-1/2 flex items-center gap-1 glass-panel rounded-xl px-1.5 py-1 shadow-xl z-10"
          >
            <div className="relative">
              <button
                onClick={() => onToggleReactPicker(msg.id)}
                className="p-1 text-muted-foreground hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10"
              >
                <Smile className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showReactPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute bottom-8 right-0 glass-panel rounded-xl p-2 flex gap-1 shadow-2xl z-20"
                  >
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => onReact(e)} className="text-base hover:scale-125 transition-transform p-0.5">{e}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {canDelete && (
              <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-red-400 transition-colors rounded-lg hover:bg-white/10">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useNavigate } from 'react-router-dom';
import { Send, Smile, UserCircle, MessageSquare, Gift } from 'lucide-react';
import { format } from 'date-fns';
import type { DmMessage } from '../../types';
import FramedAvatar from '../ui/FramedAvatar';

const EMOJIS = ['😀','😂','😍','😎','🥺','😭','🔥','✨','💀','🎉','❤️','👍','👋','🤔','😡','🥳','💯','🤝','🫡','🙏'];
const API = '/api';
const authHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('animecord_token') || ''}` });

export default function DmArea({ userId }: { userId: string }) {
  const { dms, fetchDms, sendDm, users, claimFrame } = useChatStore();
  const { user: me } = useAuthStore();
  const { openUserProfileModal, addToast } = useUiStore();

  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otherUser = users.find(u => u.id === userId);
  const convDms = dms.filter(m => {
    const key = [me?.id, userId].sort().join('::');
    return m.dmKey === key || (
      (m.senderId === me?.id && m.receiverId === userId) ||
      (m.senderId === userId && m.receiverId === me?.id)
    );
  });

  // Mark messages as read when opening DM
  const markRead = useCallback(async () => {
    await fetch(`${API}/dmAction`, {
      method: 'POST', headers: authHdr(), body: JSON.stringify({ action: 'mark_read', payload: { fromUserId: userId } }),
    });
  }, [userId]);

  useEffect(() => {
    fetchDms(userId);
    markRead();
    // Poll typing
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/typingAction?dmUserId=${userId}`, { headers: authHdr() });
        const data = await r.json();
        setTypingUsers(Array.isArray(data) ? data.map((t: { userName: string }) => t.userName) : []);
      } catch {}
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [userId, fetchDms, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convDms.length]);

  // Broadcast typing event
  const handleTyping = () => {
    fetch(`${API}/typingAction`, { method: 'POST', headers: authHdr(), body: JSON.stringify({ dmUserId: userId }) }).catch(() => {});
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    const text = content.trim();
    setContent('');
    setShowEmoji(false);
    setSending(true);
    await sendDm(userId, text);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e as unknown as React.FormEvent);
  };

  const handleClaimFrame = async (messageId: string, frameId: string) => {
    await claimFrame(messageId, frameId);
    addToast('Frame claimed and applied!', 'success');
  };

  const renderMessage = (msg: DmMessage) => {
    const isMe = msg.senderId === me?.id;

    // Frame gift card
    if (msg.type === 'frame_gift' && msg.frameGift) {
      const frameUrl = encodeURI(`/src/avatar frame/${msg.frameGift.frameName.includes('.') ? msg.frameGift.frameName : `Avatar Frame_${msg.frameGift.frameName}.png`}`);
      return (
        <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
          <FramedAvatar
            src={msg.senderAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.senderId}`}
            activeFrame={msg.senderFrame}
            size={32}
            className="border border-white/10 mt-0.5"
          />
          <div className={`max-w-[280px] ${isMe ? 'items-end' : ''}`}>
            <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
              <span className="text-xs font-semibold text-white">{msg.senderName}</span>
              <span className="text-[10px] text-muted-foreground">{format(new Date(msg.timestamp), 'h:mm a')}</span>
            </div>
            <motion.div whileHover={{ scale: 1.02 }}
              className="glass-panel rounded-2xl overflow-hidden border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
              <div className="relative h-24 overflow-hidden bg-gradient-to-br from-yellow-900/30 to-orange-900/20">
                <img src={frameUrl} alt={msg.frameGift.frameName} className="w-full h-full object-contain p-2"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Gift className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Avatar Frame Gift</span>
                </div>
                <p className="text-sm font-semibold text-white mb-2">{msg.frameGift.frameName}</p>
                <button
                  onClick={() => handleClaimFrame(msg.id, msg.frameGift!.frameId)}
                  disabled={msg.frameGift?.claimed}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                    msg.frameGift?.claimed 
                      ? 'bg-white/10 text-white/40 cursor-default'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:opacity-90'
                  }`}
                >
                  {msg.frameGift?.claimed ? '✓ Already Claimed' : 'Claim Gift'}
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
        className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
        <FramedAvatar
          src={msg.senderAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.senderId}`}
          activeFrame={msg.senderFrame}
          size={32}
          className="border border-white/10 mt-0.5"
        />
        <div className={`flex flex-col max-w-[70%] sm:max-w-[65%] ${isMe ? 'items-end' : ''}`}>
          <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-semibold text-white">{msg.senderName}</span>
            <span className="text-[10px] text-muted-foreground">{format(new Date(msg.timestamp), 'h:mm a')}</span>
          </div>
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isMe
              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-tr-none'
              : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
          }`}>
            {msg.content}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full flex-1 bg-[hsl(222,47%,6%)] min-w-0">
      {/* Header */}
      <div className="h-14 flex items-center px-4 sm:px-5 border-b border-white/5 flex-shrink-0 gap-3">
        {otherUser ? (
          <>
            <div className="relative flex-shrink-0">
              <FramedAvatar
                src={otherUser.avatar}
                activeFrame={otherUser.activeFrame}
                size={32}
                className="border border-white/10"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[hsl(222,47%,6%)] ${otherUser.isOnline ? 'status-online' : 'status-offline'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{otherUser.displayName}</p>
              <p className="text-xs text-muted-foreground">{otherUser.isOnline ? '🟢 Online' : '⚫ Offline'}</p>
            </div>
            <button onClick={() => openUserProfileModal(otherUser.id)}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-all" title="View Profile">
              <UserCircle className="w-4 h-4" />
            </button>
          </>
        ) : (
          <p className="font-semibold text-white">Direct Message</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
        {convDms.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-9 h-9 opacity-40" />
            </div>
            <p className="font-semibold text-white">Start a conversation</p>
            <p className="text-sm mt-1">Say hi to {otherUser?.displayName || 'them'}! 👋</p>
          </div>
        )}
        {convDms.map(msg => renderMessage(msg))}

        {/* Typing indicator - CSS only */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex gap-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-white/5 flex-shrink-0">
        <form onSubmit={handleSend}
          className="flex items-center gap-2 bg-[hsl(222,47%,10%)] border border-white/10 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/40 transition-all">
          <input
            ref={inputRef} type="text" value={content}
            onChange={e => { setContent(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUser?.displayName || '...'}`}
            className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-muted-foreground min-w-0"
          />
          <div className="relative flex-shrink-0">
            <button type="button" onClick={() => setShowEmoji(v => !v)}
              className="p-1.5 text-muted-foreground hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10">
              <Smile className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showEmoji && (
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-10 right-0 glass-panel rounded-2xl p-3 grid grid-cols-5 gap-1.5 shadow-2xl z-20">
                  {EMOJIS.map(e => (
                    <button key={e} type="button"
                      onClick={() => { setContent(c => c + e); setShowEmoji(false); inputRef.current?.focus(); }}
                      className="text-lg hover:scale-125 transition-transform">{e}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button type="submit" disabled={!content.trim() || sending}
            className="p-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95 btn-glow flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </form>
        {showEmoji && <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />}
      </div>
    </div>
  );
}

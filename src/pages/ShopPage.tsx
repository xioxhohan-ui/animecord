import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useUiStore } from '../store/uiStore';
import { ShoppingBag, Crown, Gift, Search, Star, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AvatarFrame } from '../types';

const API = '/.netlify/functions';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('animecord_token') || ''}`,
});

export default function ShopPage() {
  const { user, refreshUser } = useAuthStore();
  const { users, setActiveDmUser } = useChatStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const [frames, setFrames] = useState<AvatarFrame[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<string | null>(null);
  const [giftModal, setGiftModal] = useState<AvatarFrame | null>(null);
  const [giftTarget, setGiftTarget] = useState('');

  useEffect(() => {
    fetch(`${API}/frameAction`, { 
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'list' })
    })
      .then(r => r.json())
      .then(data => { setFrames(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const owned = user?.ownedFrames || [];
  const active = user?.activeFrame || '';
  const isCEO = user?.role === 'CEO';

  const filtered = frames.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const handleEquip = async (frame: AvatarFrame) => {
    setEquipping(frame.id);
    const newId = active === frame.id ? '' : frame.id;
    const res = await fetch(`${API}/frameAction`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'equip', payload: { frameId: newId } }),
    });
    const data = await res.json();
    if (data.user) {
      refreshUser();
      addToast(newId ? `Equipped ${frame.name}!` : 'Frame removed', 'success');
    } else {
      addToast(data.error || 'Failed', 'error');
    }
    setEquipping(null);
  };

  const handleBuy = async (frame: AvatarFrame) => {
    const ceo = users.find(u => u.role === 'CEO');
    if (!ceo) {
      addToast('CEO is currently unavailable.', 'error');
      return;
    }
    setActiveDmUser(ceo.id);
    const { sendDm } = useChatStore.getState();
    await sendDm(ceo.id, `I want to buy the frame: "${frame.name}" (ID: ${frame.id}) for 10 tk.`);
    addToast(`Opened DM with CEO to purchase ${frame.name}`, 'success');
    navigate(`/dm/${ceo.id}`);
  };

  const handleGift = async () => {
    if (!giftModal || !giftTarget) return;
    const target = users.find(u => u.id === giftTarget);
    if (!target) return;
    const res = await fetch(`${API}/frameAction`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'gift', payload: { toUserId: giftTarget, frameId: giftModal.id } }),
    });
    const data = await res.json();
    if (data.success) {
      addToast(`Gifted "${giftModal.name}" to ${target.displayName}!`, 'success');
      setGiftModal(null);
      setGiftTarget('');
    } else {
      addToast(data.error || 'Failed', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[hsl(222,47%,6%)]">
      {/* UI Content (remains largely same as before but with Netlify logic) */}
      <div className="sticky top-0 z-10 bg-[hsl(222,47%,6%)]/90 backdrop-blur border-b border-white/5 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Avatar Frame Shop</h1>
            <p className="text-sm text-muted-foreground">Serverless Editions — 10 tk each</p>
          </div>
          {user && (
            <div className="ml-auto flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-1.5">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">{user.coins ?? 0} tk</span>
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search frames..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map(frame => {
              const isOwned = isCEO || owned.includes(frame.id);
              const isActive = active === frame.id;
              const frameUrl = encodeURI(`/src/avatar frame/${frame.filename}`);
              return (
                <motion.div
                  key={frame.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`glass-panel rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                    isActive ? 'border-primary/60 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="relative bg-gradient-to-br from-violet-900/30 to-blue-900/30 flex items-center justify-center p-4 aspect-square group-hover:bg-violet-900/40 transition-colors">
                    <img
                      src={frameUrl}
                      alt={frame.name}
                      className="w-full h-full object-contain drop-shadow-2xl filter brightness-110"
                      onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="40">🖼️</text></svg>'; }}
                    />
                    {isActive && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-white truncate mb-2">{frame.name}</p>
                    <div className="flex gap-1.5 flex-col">
                      {isOwned ? (
                        <button
                          onClick={() => handleEquip(frame)}
                          className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isActive ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-primary text-white'
                          }`}
                        >
                          {isActive ? 'Unequip' : 'Equip'}
                        </button>
                      ) : (
                        <button onClick={() => handleBuy(frame)} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          Buy · 10 tk
                        </button>
                      )}
                      {isCEO && (
                        <button onClick={() => setGiftModal(frame)} className="w-full py-1 rounded-lg text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center gap-1">
                          <Gift className="w-3 h-3" /> Gift
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {giftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setGiftModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-sm glass-panel rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-5">
                <Gift className="w-5 h-5 text-pink-400" />
                <div>
                  <h3 className="text-white font-bold">Gift Frame</h3>
                  <p className="text-xs text-muted-foreground">{giftModal.name}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">Select User</label>
                <select value={giftTarget} onChange={e => setGiftTarget(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
                  <option value="">Choose a user...</option>
                  {users.filter(u => u.role !== 'CEO').map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setGiftModal(null)} className="flex-1 py-2 rounded-xl text-sm border border-white/10 text-muted-foreground">Cancel</button>
                <button onClick={handleGift} disabled={!giftTarget} className="flex-1 py-2 rounded-xl text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold disabled:opacity-40">Gift Now</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

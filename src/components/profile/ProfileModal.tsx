import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { X, Save, Camera, Lock } from 'lucide-react';
import FramedAvatar from '../ui/FramedAvatar';

export default function ProfileModal() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const { closeProfileModal, addToast } = useUiStore();

  const [tab, setTab] = useState<'profile' | 'security'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [banner, setBanner] = useState(user?.banner || '');
  const [status, setStatus] = useState<string>(user?.status || 'online');
  const [gender, setGender] = useState(user?.gender || '');
  const [age, setAge] = useState(user?.age || '');
  const [loading, setLoading] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setLoading(true);
    await updateProfile({ displayName, bio, avatar, banner, status: status as never, gender: gender || undefined, age: age || undefined });
    setLoading(false);
    addToast('Profile updated!', 'success');
    closeProfileModal();
  };

  const handlePasswordChange = async () => {
    if (newPw !== confirmPw) { addToast('Passwords do not match', 'error'); return; }
    if (newPw.length < 6) { addToast('Password must be at least 6 characters', 'error'); return; }
    setPwLoading(true);
    const result = await changePassword(currentPw, newPw);
    setPwLoading(false);
    if (result.success) {
      addToast('Password changed successfully!', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } else {
      addToast(result.error || 'Failed to change password', 'error');
    }
  };

  const roleColors = { CEO: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', ADMIN: 'text-blue-400 bg-blue-500/20 border-blue-500/30', USER: 'text-violet-400 bg-violet-500/20 border-violet-500/30' };
  const statusOptions = [
    { value: 'online', label: '🟢 Online' },
    { value: 'idle', label: '🟡 Idle' },
    { value: 'dnd', label: '🔴 Do Not Disturb' },
    { value: 'offline', label: '⚫ Invisible' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-4xl glass-panel rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
      >
        {/* Left: Form */}
        <div className="flex-1 p-6 flex flex-col gap-4 bg-black/20 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit Profile</h2>
            <button onClick={closeProfileModal} className="text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab selector */}
          <div className="flex gap-1 bg-black/30 rounded-xl p-1 mb-1">
            <button onClick={() => setTab('profile')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'profile' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'}`}>
              Profile
            </button>
            <button onClick={() => setTab('security')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'security' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'}`}>
              <Lock className="w-3 h-3" /> Security
            </button>
          </div>

          {tab === 'profile' ? (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <Field label="Display Name">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-base"
                placeholder="Your display name"
              />
            </Field>

            <Field label="Bio">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="input-base resize-none"
                placeholder="Tell people about yourself..."
              />
            </Field>

            <Field label="Avatar URL">
              <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} className="input-base" placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">Paste a URL or use DiceBear: https://api.dicebear.com/7.x/notionists/svg?seed=yourname</p>
            </Field>

            <Field label="Banner URL">
              <input type="text" value={banner} onChange={e => setBanner(e.target.value)} className="input-base" placeholder="https://..." />
            </Field>

            <Field label="Status">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="input-base"
              >
                {statusOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Gender">
                <select value={gender} onChange={e => setGender(e.target.value)} className="input-base">
                  <option value="">Not set</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Age">
                <input
                  type="number" min="13" max="120"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="input-base"
                  placeholder="e.g. 18"
                />
              </Field>
            </div>
          </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-xs text-yellow-400 font-medium">🔐 Change your account password. You'll need your current password to confirm.</p>
              </div>
              <Field label="Current Password">
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="input-base" placeholder="Enter current password" />
              </Field>
              <Field label="New Password">
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="input-base" placeholder="At least 6 characters" />
              </Field>
              <Field label="Confirm New Password">
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="input-base" placeholder="Repeat new password" />
              </Field>
            </div>
          )}


          <button
            onClick={tab === 'profile' ? handleSave : handlePasswordChange}
            disabled={tab === 'profile' ? loading : pwLoading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2 btn-glow disabled:opacity-50 mt-2"
          >
            {tab === 'profile' ? <Save className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {tab === 'profile'
              ? (loading ? 'Saving...' : 'Save Changes')
              : (pwLoading ? 'Changing...' : 'Change Password')}
          </button>
        </div>

        {/* Right: Live Preview */}
        <div className="w-full md:w-[340px] p-6 flex flex-col items-center justify-center bg-gradient-to-br from-black/60 to-black/80 flex-shrink-0 border-l border-white/5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Live Preview</p>

          <div className="w-full bg-[hsl(222,47%,8%)] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Banner */}
            <div className="h-40 relative">
              {banner ? (
                <img src={banner} alt="banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-violet-600/50 to-blue-600/50" />
              )}
            </div>

            <div className="px-4 pb-4 relative">
              {/* Avatar */}
              <div className="relative -mt-16 mb-4 w-fit">
                {avatar ? (
                  <FramedAvatar src={avatar} activeFrame={user.activeFrame} size={120} className="border-4 border-[hsl(222,47%,8%)]" />
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-[hsl(222,47%,8%)] overflow-hidden bg-[hsl(222,47%,10%)] flex items-center justify-center text-muted-foreground">
                    <Camera className="w-12 h-12" />
                  </div>
                )}
                <span className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-[hsl(222,47%,8%)] z-20 ${
                  status === 'online' ? 'status-online' : status === 'idle' ? 'status-idle' : status === 'dnd' ? 'status-dnd' : 'status-offline'
                }`} />
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">{displayName || 'Display Name'}</h4>
                  <p className="text-xs text-primary truncate">@{user.username}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${roleColors[user.role]}`}>
                  {user.role}
                </span>
              </div>

              {bio && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        .input-base {
          width: 100%;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }
        .input-base:focus { ring: 2px; ring-color: hsl(263 80% 60% / 0.5); border-color: hsl(263 80% 60% / 0.5); }
        .input-base option { background: hsl(222 47% 10%); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

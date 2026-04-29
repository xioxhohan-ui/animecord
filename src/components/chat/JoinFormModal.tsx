import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { X, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

export default function JoinFormModal({
  inviteCode,
  onClose,
  onSuccess
}: {
  inviteCode: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { joinServerWithData } = useChatStore();
  const { user } = useAuthStore();
  
  // Default to what we have or blank
  const [gender, setGender] = useState(user?.gender || '');
  const [age, setAge] = useState(user?.age || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender || !age) return;
    setLoading(true);
    await joinServerWithData({ inviteCode, gender, age });
    setLoading(false);
    useUiStore.getState().addToast('Joined server!', 'success');
    onSuccess();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-6 relative border border-white/10"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 text-primary mb-4">
            <Sparkles className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Almost there!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Please confirm your profile details before joining.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none"
                required
              >
                <option value="" disabled>Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Age
              </label>
              <input
                type="number"
                min="13"
                max="120"
                value={age}
                onChange={e => setAge(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20"
                placeholder="e.g. 18"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !gender || !age}
              className="w-full py-3.5 mt-6 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Complete & Join'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

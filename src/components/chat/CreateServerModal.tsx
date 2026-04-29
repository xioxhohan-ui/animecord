import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { useUiStore } from '../../store/uiStore';
import { X, Server, Sparkles } from 'lucide-react';

export default function CreateServerModal() {
  const { closeCreateServerModal, addToast } = useUiStore();
  const { createServer, setActiveServer } = useChatStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const server = await createServer(name.trim());
    setLoading(false);
    if (server) {
      setActiveServer(server.id);
      addToast(`Server "${server.name}" created!`, 'success');
      closeCreateServerModal();
    } else {
      addToast('Failed to create server', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-br from-violet-600/40 to-blue-600/40 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-2xl">
            <Server className="w-8 h-8 text-white" />
          </div>
          <button
            onClick={closeCreateServerModal}
            className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-bold text-white text-center mb-1">Create a Server</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Your server is where you and your community hang out.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Server Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Awesome Server"
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 btn-glow"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Server'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

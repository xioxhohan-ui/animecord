import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, MessageSquare } from 'lucide-react';
import { getDeviceFingerprint } from '../utils/fingerprint';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const deviceId = await getDeviceFingerprint();
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          displayName: displayName.trim() || username.trim(),
          deviceId
        }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        const returnUrl = searchParams.get('returnUrl');
        if (returnUrl) navigate(returnUrl);
        else navigate('/home');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen ambient-bg bg-[hsl(222,47%,6%)] flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(139,92,246,0.4)]">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">AnimeCord</h1>
          <p className="text-muted-foreground mt-1">Join the community</p>
        </div>

        <div className="glass-panel rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Create an account</h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                placeholder="cooluser123"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Display Name <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                placeholder="Cool User"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 btn-glow mt-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-5">
            <span className="text-muted-foreground text-sm">Already have an account? </span>
            <Link
              to={searchParams.get('returnUrl') ? `/login?returnUrl=${encodeURIComponent(searchParams.get('returnUrl')!)}` : '/login'}
              className="text-primary hover:text-violet-300 text-sm font-semibold transition-colors"
            >Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Users } from 'lucide-react';
import JoinFormModal from '../components/chat/JoinFormModal';

export default function InvitePreviewPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [searchParams] = useSearchParams();
  
  const [serverData, setServerData] = useState<{
    id: string;
    name: string;
    avatar?: string;
    banner?: string;
    memberCount: number;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to login with a returnUrl
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?returnUrl=/invite/${code}`);
      return;
    }

    const fetchInvite = async () => {
      try {
        const res = await fetch(`/.netlify/functions/getInvite?code=${code}`);
        if (!res.ok) {
          setError('Invalid or expired invite link.');
          return;
        }
        const data = await res.json();
        setServerData(data);
      } catch (e) {
        setError('Failed to load invite info.');
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading && isAuthenticated) {
      fetchInvite();
    }
  }, [code, isAuthenticated, isLoading, navigate]);

  if (isLoading || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[hsl(222,47%,6%)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 mb-4" />
          <p className="text-muted-foreground text-sm">Loading Invite...</p>
        </div>
      </div>
    );
  }

  if (error || !serverData) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[hsl(222,47%,6%)]">
        <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
        <p className="text-red-400 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[hsl(222,47%,6%)] p-4 ambient-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative z-10"
      >
        <div className="relative h-32 bg-black/40">
          {serverData.banner ? (
            <img src={serverData.banner} alt="banner" className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-600/40 to-blue-600/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
        
        <div className="px-6 pb-6 text-center">
          <div className="w-20 h-20 mx-auto -mt-10 mb-4 rounded-2xl bg-[hsl(222,47%,8%)] border-4 border-[hsl(222,47%,8%)] overflow-hidden shadow-xl">
            {serverData.avatar ? (
              <img src={serverData.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
                {serverData.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            You have been invited to join
          </p>
          <h2 className="text-2xl font-bold text-white mb-2">{serverData.name}</h2>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-8">
            <Users className="w-4 h-4" />
            <span>{serverData.memberCount} Members</span>
          </div>
          
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Join Server
          </button>
        </div>
      </motion.div>

      {showJoinModal && (
        <JoinFormModal 
          inviteCode={code!} 
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => navigate('/home')}
        />
      )}
    </div>
  );
}

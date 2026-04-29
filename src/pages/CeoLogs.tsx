import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { 
  Shield, 
  History, 
  Search, 
  Filter, 
  User as UserIcon, 
  ShieldAlert, 
  Ban, 
  Trash2, 
  ArrowUpCircle,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface ModLog {
  id: string;
  actionType: string;
  targetId: string;
  performedBy: string;
  reason: string;
  timestamp: number;
}

const ACTION_COLORS: Record<string, string> = {
  USER_BAN: 'text-red-400 bg-red-400/10 border-red-500/20',
  DEVICE_BAN: 'text-red-500 bg-red-500/10 border-red-600/20',
  KICK: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20',
  PROMOTE: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
  AUTO_DETECTION: 'text-orange-400 bg-orange-400/10 border-orange-500/20',
  MESSAGE_DELETE: 'text-gray-400 bg-gray-400/10 border-gray-500/20',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  USER_BAN: <Ban className="w-4 h-4" />,
  DEVICE_BAN: <ShieldAlert className="w-4 h-4" />,
  KICK: <UserIcon className="w-4 h-4" />,
  PROMOTE: <ArrowUpCircle className="w-4 h-4" />,
  AUTO_DETECTION: <Zap className="w-4 h-4" />,
  MESSAGE_DELETE: <Trash2 className="w-4 h-4" />,
};

export default function CeoLogs() {
  const [logs, setLogs] = useState<ModLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { token } = useAuthStore();

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/ceo/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // In a real app, we'd use the log-update socket event here
  }, []);

  const filteredLogs = logs.filter(l => 
    l.actionType.toLowerCase().includes(filter.toLowerCase()) ||
    l.reason.toLowerCase().includes(filter.toLowerCase()) ||
    l.targetId.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Moderation Logs</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">System Enforcement History</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter by action, user, or reason..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-64 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="py-20 text-center">
                <Shield className="w-16 h-16 text-white/5 mx-auto mb-4" />
                <p className="text-muted-foreground">No moderation logs found.</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  key={log.id}
                  className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-[#111114] border border-white/5 hover:border-white/10 hover:bg-[#141418] transition-all"
                >
                  {/* Action Icon */}
                  <div className={`w-12 h-12 rounded-xl border flex-shrink-0 flex items-center justify-center ${ACTION_COLORS[log.actionType] || 'text-gray-400 bg-gray-400/10 border-gray-500/20'}`}>
                    {ACTION_ICONS[log.actionType] || <Shield className="w-5 h-5" />}
                  </div>

                  {/* Log Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${ACTION_COLORS[log.actionType] || ''}`}>
                        {log.actionType.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {format(log.timestamp, 'MMM d, h:mm:ss a')}
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">
                      <span className="text-violet-400">@{log.performedBy}</span> performed action on <span className="text-blue-400">#{log.targetId}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">"{log.reason}"</p>
                  </div>

                  {/* ID & Link */}
                  <div className="flex-shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-mono text-white/20 mb-1">LOG_{log.id}</p>
                    <button className="text-xs text-violet-400 font-bold hover:underline">View Context</button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

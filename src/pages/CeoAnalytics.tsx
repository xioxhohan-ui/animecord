import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Server, 
  Ban, 
  TrendingUp, 
  Activity, 
  ShieldAlert,
  Zap
} from 'lucide-react';

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalServers: number;
  totalMessages: number;
  totalBans: number;
  messagesPerMinute: number;
  suspiciousUsers: number;
}

export default function CeoAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/ceo/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0c]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: data.totalUsers, icon: <Users className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Active (10m)', value: data.activeUsers, icon: <Activity className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Total Servers', value: data.totalServers, icon: <Server className="w-5 h-5" />, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { label: 'Total Messages', value: data.totalMessages, icon: <MessageSquare className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { label: 'Total Bans', value: data.totalBans, icon: <Ban className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Suspicious', value: data.suspiciousUsers, icon: <ShieldAlert className="w-5 h-5" />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c] overflow-y-auto">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Platform Analytics</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Real-time Metrics & KPIs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Live Stream Active</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={stat.label}
              className="p-5 rounded-2xl bg-[#111114] border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                {stat.icon}
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Per Minute Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl bg-gradient-to-br from-violet-600/10 to-transparent border border-violet-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap className="w-32 h-32 text-violet-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-400" />
                Messaging Velocity
              </h3>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-black text-white">{data.messagesPerMinute}</span>
                <span className="text-xl font-bold text-violet-400 uppercase tracking-tighter">msgs / min</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-sm">
                Calculated based on real-time message stream analysis over the last hour of platform activity.
              </p>
            </div>
          </motion.div>

          {/* Growth Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-8 rounded-3xl bg-[#111114] border border-white/5 relative flex flex-col justify-center"
          >
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Platform Efficiency
            </h3>
            <p className="text-sm text-muted-foreground mb-8">System performance and user retention metrics.</p>
            
            <div className="space-y-6">
              <ProgressBar label="Active Conversion" percent={(data.activeUsers / data.totalUsers) * 100} color="bg-green-500" />
              <ProgressBar label="Safety Rating" percent={100 - (data.totalBans / data.totalUsers) * 100} color="bg-violet-500" />
              <ProgressBar label="Server Capacity" percent={(data.totalServers / 1000) * 100} color="bg-blue-500" />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function ProgressBar({ label, percent, color }: { label: string, percent: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-white">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}

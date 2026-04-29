import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

export function useRealtime() {
  const { isAuthenticated, forceLogout } = useAuthStore();
  const {
    fetchServers,
    fetchMessages,
    fetchDms,
    fetchDmConversations,
    fetchUsers,
    activeChannelId,
    activeDmUserId,
    fetchStats
  } = useChatStore();

  const pollingIntervals = useRef<ReturnType<typeof setInterval>[]>([]);

  const stopPolling = () => {
    pollingIntervals.current.forEach(id => clearInterval(id));
    pollingIntervals.current = [];
  };

  useEffect(() => {
    if (!isAuthenticated) {
      stopPolling();
      return;
    }

    // ─── Core Security Check (Banned Check) ───
    const checkBanStatus = async () => {
      try {
        const res = await fetch('/api/checkBan', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('animecord_token')}`,
            'x-device-id': localStorage.getItem('animecord_device_id') || ''
          }
        });
        if (res.status === 403) {
          const data = await res.json();
          if (data.status === 'banned' || data.error === 'Banned') {
            forceLogout();
          }
        }
      } catch (e) {
        console.error('Ban check failed', e);
      }
    };

    // ─── Initial Fetch ───
    fetchServers();
    fetchDmConversations();
    checkBanStatus();

    // ─── Polling Intervals ───
    
    // Quick polling for messages (2s)
    const msgInterval = setInterval(() => {
      if (activeChannelId) fetchMessages(activeChannelId);
      if (activeDmUserId) fetchDms(activeDmUserId);
    }, 2000);

    // Moderate polling for servers and conversations (5s)
    const dataInterval = setInterval(() => {
      fetchServers();
      fetchDmConversations();
      fetchUsers();
    }, 5000);

    // Slow polling for security and stats (10s)
    const securityInterval = setInterval(() => {
      checkBanStatus();
      fetchStats();
    }, 10000);

    pollingIntervals.current = [msgInterval, dataInterval, securityInterval];

    return () => stopPolling();
  }, [
    isAuthenticated,
    activeChannelId,
    activeDmUserId,
    fetchServers,
    fetchMessages,
    fetchDms,
    fetchDmConversations,
    fetchStats,
    forceLogout
  ]);
}

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { pusherClient } from '../lib/pusher-client';

export function useRealtime() {
  const { isAuthenticated, forceLogout, user } = useAuthStore();
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
    if (!isAuthenticated || !pusherClient) {
      stopPolling();
      return;
    }

    // ─── Pusher Real-time Subscriptions ───
    
    // 1. Channel Messages
    let channelSub: any = null;
    if (activeChannelId) {
      channelSub = pusherClient.subscribe(`channel-${activeChannelId}`);
      channelSub.bind('new-message', (data: any) => {
        // Optimistic update already handles sending, this is for receiving
        if (data.senderId !== user?.id) {
          fetchMessages(activeChannelId);
        }
      });
      channelSub.bind('message-deleted', () => fetchMessages(activeChannelId));
      channelSub.bind('message-updated', () => fetchMessages(activeChannelId));
    }

    // 2. Personal DMs and Notifications
    const userSub = pusherClient.subscribe(`user-${user?.id}`);
    userSub.bind('new-dm', () => {
      if (activeDmUserId) fetchDms(activeDmUserId);
      fetchDmConversations();
    });

    // ─── Core Security Check (Banned Check) ───
    const checkBanStatus = async () => {
      try {
        const res = await fetch('/api/checkBan', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('animecord_token')}`,
          }
        });
        if (res.status === 403) {
          forceLogout();
        }
      } catch (e) {}
    };

    // ─── Initial Fetch ───
    fetchServers();
    fetchDmConversations();
    fetchUsers();
    checkBanStatus();

    // ─── Fallback Polling (Much Slower now with Pusher) ───
    
    // Moderate polling for data sync (30s)
    const dataInterval = setInterval(() => {
      fetchServers();
      fetchDmConversations();
      fetchUsers();
      checkBanStatus();
    }, 30000);

    // Stats polling (1m)
    const statsInterval = setInterval(() => {
      fetchStats();
    }, 60000);

    pollingIntervals.current = [dataInterval, statsInterval];

    return () => {
      stopPolling();
      if (channelSub) {
        pusherClient.unsubscribe(`channel-${activeChannelId}`);
      }
      pusherClient.unsubscribe(`user-${user?.id}`);
    };
  }, [
    isAuthenticated,
    user?.id,
    activeChannelId,
    activeDmUserId,
    fetchServers,
    fetchMessages,
    fetchDms,
    fetchDmConversations,
    fetchUsers,
    fetchStats,
    forceLogout
  ]);
}

import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import ChatArea from '../components/chat/ChatArea';
import MemberList from '../components/layout/MemberList';
import { motion } from 'framer-motion';
import { Server as ServerIcon, MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const { activeServerId, activeChannelId, servers } = useChatStore();
  const { user } = useAuthStore();

  const activeServer = servers.find(s => s.id === activeServerId);
  const activeChannel = activeServer?.channels.find(c => c.id === activeChannelId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex flex-1 w-full h-full overflow-hidden min-w-0"
    >
      {/* Chat area — flex-1 min-w-0 prevents overflow */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {activeChannelId && activeServer ? (
          <ChatArea
            channelId={activeChannelId}
            serverName={activeServer.name}
            channelName={activeChannel?.name}
          />
        ) : (
          <EmptyState hasServers={servers.length > 0} role={user?.role} />
        )}
      </div>

      {/* Member list — only when a server is active */}
      {activeServerId && <MemberList />}
    </motion.div>
  );
}

function EmptyState({ hasServers, role }: { hasServers: boolean; role?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 h-full">
      <div className="relative mb-6">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/10 flex items-center justify-center">
          {hasServers ? (
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-primary opacity-60" />
          ) : (
            <ServerIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary opacity-60" />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-base">
          {hasServers ? '💬' : '✨'}
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
        {hasServers ? 'Select a channel' : 'No servers yet'}
      </h2>
      <p className="text-muted-foreground text-sm max-w-xs sm:max-w-sm">
        {hasServers
          ? 'Pick a server from the sidebar, then choose a channel to start chatting.'
          : role === 'USER'
          ? 'Wait for an admin to create a server, then join it!'
          : 'Click the + button in the sidebar to create your first server.'}
      </p>
    </div>
  );
}

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import ChatArea from '../components/chat/ChatArea';
import MemberList from '../components/layout/MemberList';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';

export default function ServerPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { servers, activeServerId, activeChannelId, setActiveServer, setActiveChannel } = useChatStore();

  const server = servers.find(s => s.id === serverId);

  useEffect(() => {
    if (!serverId) return;
    if (servers.length > 0 && !server) {
      navigate('/home', { replace: true });
      return;
    }
    if (server && activeServerId !== serverId) {
      setActiveServer(serverId);
    }
  }, [serverId, server, servers.length]);

  // Auto-select first channel when server loads
  useEffect(() => {
    if (server && !activeChannelId && server.channels.length > 0) {
      setActiveChannel(server.channels[0].id);
    }
  }, [server?.id, activeChannelId]);

  if (!server) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Hash className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Loading server...</p>
        </div>
      </div>
    );
  }

  const activeChannel = server.channels.find(c => c.id === activeChannelId);

  return (
    <motion.div
      key={serverId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="flex flex-1 w-full h-full overflow-hidden min-w-0"
    >
      {/* Chat area — flex-1 min-w-0 is critical to prevent overflow */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {activeChannelId ? (
          <ChatArea
            channelId={activeChannelId}
            serverName={server.name}
            channelName={activeChannel?.name}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <Hash className="w-12 h-12 mx-auto mb-3 text-primary opacity-40" />
              <p className="text-white font-semibold mb-1">Select a channel</p>
              <p className="text-muted-foreground text-sm">Pick a channel from the sidebar to start chatting.</p>
            </div>
          </div>
        )}
      </div>

      {/* Member list */}
      <MemberList />
    </motion.div>
  );
}

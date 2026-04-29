import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import DmArea from '../components/chat/DmArea';
import { motion } from 'framer-motion';

export default function DmPage() {
  const { userId } = useParams<{ userId: string }>();
  const { setActiveDmUser, fetchDms } = useChatStore();

  useEffect(() => {
    if (!userId) return;
    setActiveDmUser(userId);
    fetchDms(userId);
  }, [userId]);

  if (!userId) return null;

  return (
    <motion.div
      key={userId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="flex flex-1 w-full h-full overflow-hidden min-w-0"
    >
      <DmArea userId={userId} />
    </motion.div>
  );
}

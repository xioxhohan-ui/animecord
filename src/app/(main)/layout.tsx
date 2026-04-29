'use client';

import Sidebar from '@/components/layout/Sidebar';
import ToastContainer from '@/components/layout/ToastContainer';
import ProfileModal from '@/components/profile/ProfileModal';
import UserProfileModal from '@/components/profile/UserProfileModal';
import CreateServerModal from '@/components/chat/CreateServerModal';
import EditServerModal from '@/components/chat/EditServerModal';
import { useUiStore } from '@/store/uiStore';
import ConfirmModal from '@/components/layout/ConfirmModal';
import { GlobalContextMenu } from '@/components/ui/ContextMenu';
import JoinFormModal from '@/components/chat/JoinFormModal';
import BanModal from '@/components/ui/BanModal';
import { useRealtime } from '@/hooks/useRealtime';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  useRealtime();
  const { isAuthenticated, isLoading, fetchMe } = useAuthStore();
  const router = useRouter();

  const {
    isProfileModalOpen,
    isCreateServerModalOpen,
    isEditServerModalOpen,
    isUserProfileModalOpen,
    isJoinFormModalOpen,
    joinFormServerId,
    closeJoinFormModal,
  } = useUiStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[hsl(222,47%,6%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.5)] animate-pulse">
            <span className="text-white text-2xl">⚡</span>
          </div>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">Loading AnimeCord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[hsl(222,47%,6%)] overflow-hidden font-sans text-foreground ambient-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative pt-14 lg:pt-0">
        {children}
      </main>

      {/* Global Modals */}
      {isProfileModalOpen && <ProfileModal />}
      {isCreateServerModalOpen && <CreateServerModal />}
      {isEditServerModalOpen && <EditServerModal />}
      {isUserProfileModalOpen && <UserProfileModal />}
      {isJoinFormModalOpen && joinFormServerId && (
        <JoinFormModal serverId={joinFormServerId} onClose={closeJoinFormModal} />
      )}
      <ConfirmModal />
      <ToastContainer />
      <GlobalContextMenu />
      <BanModal />
    </div>
  );
}

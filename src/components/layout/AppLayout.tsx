import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';
import ProfileModal from '../profile/ProfileModal';
import UserProfileModal from '../profile/UserProfileModal';
import CreateServerModal from '../chat/CreateServerModal';
import EditServerModal from '../chat/EditServerModal';
import { useUiStore } from '../../store/uiStore';
import ConfirmModal from './ConfirmModal';
import { GlobalContextMenu } from '../ui/ContextMenu';
import JoinFormModal from '../chat/JoinFormModal';
import BanModal from '../ui/BanModal';
import { useRealtime } from '../../hooks/useRealtime';

export default function AppLayout() {
  useRealtime();
  const {
    isProfileModalOpen,
    isCreateServerModalOpen,
    isEditServerModalOpen,
    isUserProfileModalOpen,
    isJoinFormModalOpen,
    joinFormServerId,
    closeJoinFormModal,
  } = useUiStore();

  return (
    <div className="flex h-screen w-screen bg-[hsl(222,47%,6%)] overflow-hidden font-sans text-foreground ambient-bg">
      {/* Sidebar — only shows as inline on lg+ screens; mobile uses overlay */}
      <Sidebar />

      {/* Main content area — always takes remaining width, min-w-0 prevents flex overflow */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative pt-14 lg:pt-0">
        <Outlet />
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

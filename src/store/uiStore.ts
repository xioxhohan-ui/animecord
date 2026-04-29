import { create } from 'zustand';
import type { Toast } from '../types';

interface UiState {
  isProfileModalOpen: boolean;
  isCreateServerModalOpen: boolean;
  isEditServerModalOpen: boolean;
  editServerTargetId: string | null;
  isUserProfileModalOpen: boolean;
  viewingUserId: string | null;
  isMobileSidebarOpen: boolean;
  isMemberListOpen: boolean;
  isJoinFormModalOpen: boolean;
  joinFormServerId: string | null;
  toasts: Toast[];

  confirmModal: {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null;

  banModal: {
    isOpen: boolean;
    message: string;
  } | null;

  openConfirmModal: (title: string, description: string, onConfirm: () => void) => void;
  closeConfirmModal: () => void;

  openProfileModal: () => void;
  closeProfileModal: () => void;

  openCreateServerModal: () => void;
  closeCreateServerModal: () => void;

  openEditServerModal: (serverId: string) => void;
  closeEditServerModal: () => void;

  openUserProfileModal: (userId: string) => void;
  closeUserProfileModal: () => void;

  openJoinFormModal: (serverId: string) => void;
  closeJoinFormModal: () => void;

  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  toggleMemberList: () => void;

  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  openBanModal: (message: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  isProfileModalOpen: false,
  isCreateServerModalOpen: false,
  isEditServerModalOpen: false,
  editServerTargetId: null,
  isUserProfileModalOpen: false,
  viewingUserId: null,
  isMobileSidebarOpen: false,
  isMemberListOpen: false,
  isJoinFormModalOpen: false,
  joinFormServerId: null,
  toasts: [],
  confirmModal: null,
  banModal: null,

  openConfirmModal: (title, description, onConfirm) => set({
    confirmModal: { isOpen: true, title, description, onConfirm }
  }),
  closeConfirmModal: () => set(s => ({
    confirmModal: s.confirmModal ? { ...s.confirmModal, isOpen: false } : null
  })),

  openProfileModal: () => set({ isProfileModalOpen: true }),
  closeProfileModal: () => set({ isProfileModalOpen: false }),

  openCreateServerModal: () => set({ isCreateServerModalOpen: true }),
  closeCreateServerModal: () => set({ isCreateServerModalOpen: false }),

  openEditServerModal: (serverId) => set({ isEditServerModalOpen: true, editServerTargetId: serverId }),
  closeEditServerModal: () => set({ isEditServerModalOpen: false, editServerTargetId: null }),

  openUserProfileModal: (userId) => set({ isUserProfileModalOpen: true, viewingUserId: userId }),
  closeUserProfileModal: () => set({ isUserProfileModalOpen: false, viewingUserId: null }),

  openJoinFormModal: (serverId) => set({ isJoinFormModalOpen: true, joinFormServerId: serverId }),
  closeJoinFormModal: () => set({ isJoinFormModalOpen: false, joinFormServerId: null }),

  toggleMobileSidebar: () => set(s => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

  toggleMemberList: () => set(s => ({ isMemberListOpen: !s.isMemberListOpen })),

  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  openBanModal: (message) => set({ banModal: { isOpen: true, message } }),
}));

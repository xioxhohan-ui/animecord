import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal() {
  const { confirmModal, closeConfirmModal } = useUiStore();

  if (!confirmModal?.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{confirmModal.title}</h2>
            </div>
          </div>
          
          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            {confirmModal.description}
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={closeConfirmModal}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                confirmModal.onConfirm();
                closeConfirmModal();
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-red-500/20"
            >
              Confirm Action
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

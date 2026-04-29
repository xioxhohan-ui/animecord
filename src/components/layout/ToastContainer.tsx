import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
};

const colors = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border glass-panel shadow-2xl min-w-[220px] max-w-xs ${colors[t.type]}`}
          >
            {icons[t.type]}
            <span className="text-sm text-white/90 flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

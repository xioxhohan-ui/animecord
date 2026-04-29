import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BanModal() {
  const { banModal } = useUiStore();
  const navigate = useNavigate();

  if (!banModal?.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md glass-panel rounded-3xl border border-red-500/30 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]"
        >
          <div className="h-2 bg-red-500 w-full" />
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Account Permanently Banned</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              {banModal.message || "Your account has been permanently suspended for violating our terms of service."}
            </p>

            <div className="space-y-3">
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/10 text-xs text-red-400 font-medium mb-6">
                All your messages, DMs, and server memberships have been purged.
              </div>

              <button
                onClick={() => window.location.href = '/login'}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all group"
              >
                <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                Return to Login
              </button>
            </div>
          </div>
          <div className="p-4 bg-black/40 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">AnimeCord Security Enforcement</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

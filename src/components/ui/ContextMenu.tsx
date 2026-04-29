import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', handle);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handle);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position so menu doesn't go off screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 38 + 16));

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{ position: 'fixed', left: adjustedX, top: adjustedY, zIndex: 9999 }}
      className="w-48 glass-panel rounded-xl shadow-2xl border border-white/10 py-1.5 overflow-hidden"
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && i > 0 && <div className="h-px bg-white/10 my-1 mx-2" />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
              item.danger
                ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.icon && <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </motion.div>
  );
}

// Global context menu state manager
import { create } from 'zustand';

interface ContextMenuState {
  menu: { items: ContextMenuItem[]; x: number; y: number } | null;
  showMenu: (items: ContextMenuItem[], x: number, y: number) => void;
  hideMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>(set => ({
  menu: null,
  showMenu: (items, x, y) => set({ menu: { items, x, y } }),
  hideMenu: () => set({ menu: null }),
}));

export function GlobalContextMenu() {
  const { menu, hideMenu } = useContextMenuStore();
  return (
    <AnimatePresence>
      {menu && (
        <ContextMenu
          items={menu.items}
          x={menu.x}
          y={menu.y}
          onClose={hideMenu}
        />
      )}
    </AnimatePresence>
  );
}

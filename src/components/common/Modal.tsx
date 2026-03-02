import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  zIndex = 100
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          style={{ zIndex }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full ${maxWidth} overflow-hidden border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                {title}
              </h3>
              <button 
                onClick={onClose} 
                className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {children}
            </div>
          </motion.div>
          
          <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
};

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../contexts';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  preventAutoClose?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  preventAutoClose = false
}) => {
  if (!isOpen) return null;

  const { t } = useI18n();
  const resolvedCancelText = cancelText || t('common.cancel');
  const resolvedConfirmText = confirmText || t('common.delete');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 opacity-100 border border-slate-100 dark:border-slate-800" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-5 text-rose-500 dark:text-rose-400">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed px-4">{message}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 outline-none"
            >
              {resolvedCancelText}
            </button>
            <button
              onClick={async () => { 
                await onConfirm(); 
                if (!preventAutoClose) onClose(); 
              }}
              className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 shadow-lg shadow-rose-200 dark:shadow-rose-900/20 transition-all focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 outline-none"
            >
              {resolvedConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

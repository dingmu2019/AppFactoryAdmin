import React from 'react';
import { X, Rocket } from 'lucide-react';
import { useI18n } from '../../contexts';
import { SYSTEM_CONFIG } from '../../constants';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden relative border border-slate-200 dark:border-slate-800 scale-100" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
            </button>
            <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6 text-white transform hover:scale-105 transition-transform duration-500">
                    <Rocket size={48} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('about.title')}</h2>
                <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                        {SYSTEM_CONFIG.version}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                        Build {SYSTEM_CONFIG.build}
                    </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 my-8 leading-relaxed text-sm">
                    {t('about.description')}
                </p>
                <div className="text-xs font-medium text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-6 w-full">
                     {t('about.copyright')}
                </div>
            </div>
        </div>
    </div>
  );
};

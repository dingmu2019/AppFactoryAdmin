
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Camera, Download, MoreVertical, StopCircle, Trash2, Share2 } from 'lucide-react';
import { Tooltip } from "@/components/Tooltip";
import { useI18n } from '@/contexts';

interface DebateHeaderProps {
  debate: any;
  onBack: () => void;
  onScreenshot: () => void;
  onExportPDF: () => void;
  onDelete: () => void;
  onStop: () => void;
  onShare: () => void;
  isDeleting: boolean;
  isStopping: boolean;
}

export const DebateHeader: React.FC<DebateHeaderProps> = ({
  debate,
  onBack,
  onScreenshot,
  onExportPDF,
  onDelete,
  onStop,
  onShare,
  isDeleting,
  isStopping,
}) => {
  const { t } = useI18n();
  const isRunning = debate.status === 'running';
  const isShareable = debate.status === 'completed' || debate.status === 'terminated';
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const primary =
    isRunning
      ? { label: t('common.stop'), onClick: onStop, disabled: isStopping, icon: <StopCircle size={16} /> }
      : isShareable
        ? { label: t('common.share'), onClick: onShare, disabled: false, icon: <Share2 size={16} /> }
        : null;

  return (
    <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold text-zinc-900 dark:text-white truncate max-w-md">{debate.topic}</h2>
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
            <span className="capitalize">{debate.mode.replace('_', ' ')}</span>
            <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
            <span className={`flex items-center gap-1 ${debate.status === 'running' ? 'text-indigo-600 animate-pulse' : ''}`}>
              {debate.status === 'running' ? <Clock size={12} /> : 
               debate.status === 'completed' ? <CheckCircle size={12} /> : 
               <AlertTriangle size={12} />}
              {debate.status}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {primary && (
          <button
            onClick={primary.onClick}
            disabled={primary.disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors ${
              isRunning
                ? 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
            }`}
          >
            {primary.icon}
            {primary.label}
          </button>
        )}

        <div ref={menuRef} className="relative">
          <Tooltip content={t('common.ai.debatesPage.detail.more')}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm transition-colors"
            >
              <MoreVertical size={18} />
            </button>
          </Tooltip>

          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden">
              {!primary?.label.includes(t('common.share')) && isShareable && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onShare();
                  }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-300"
                >
                  <Share2 size={16} />
                  {t('common.share')}
                </button>
              )}

              {!primary?.label.includes(t('common.stop')) && isRunning && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onStop();
                  }}
                  disabled={isStopping}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-2 text-rose-600 dark:text-rose-300 disabled:opacity-60"
                >
                  <StopCircle size={16} />
                  {t('common.stop')}
                </button>
              )}

              <button
                onClick={() => {
                  setOpen(false);
                  onScreenshot();
                }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-2"
              >
                <Camera size={16} />
                {t('common.ai.assistant.screenshot')}
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  onExportPDF();
                }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-2"
              >
                <Download size={16} />
                {t('common.ai.assistant.exportPDF')}
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

              <button
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                disabled={isDeleting}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-2 text-rose-600 dark:text-rose-300 disabled:opacity-60"
              >
                <Trash2 size={16} />
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

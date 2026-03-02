
import React, { useEffect, useState } from 'react';
import { Sparkles, X, File as FileIcon, Paperclip, Loader2, Wand2, Send } from 'lucide-react';
import { Tooltip } from '../../../../components/Tooltip';
import { useI18n } from '../../../../contexts';
import type { Prompt, Attachment, Agent } from '../types';

interface ChatInputProps {
  prompts: Prompt[];
  attachments: Attachment[];
  isLoading: boolean;
  activeAgent: Agent | null;
  onSend: (content: string) => Promise<{ ok: boolean; restoreInput?: string }>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  onOptimize: (content: string) => Promise<string | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  prompts,
  attachments,
  isLoading,
  activeAgent,
  onSend,
  onFileSelect,
  onRemoveAttachment,
  onOptimize,
  fileInputRef,
  inputRef,
}) => {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    setInput('');
  }, [activeAgent?.id]);

  const sendCurrent = async () => {
    if (isLoading) return;
    if (!input.trim() && attachments.length === 0) return;
    const content = input;
    setInput('');
    const result = await onSend(content);
    if (!result.ok && typeof result.restoreInput === 'string') setInput(result.restoreInput);
  };

  return (
    <div className="px-8 pb-3 pt-2 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 dark:to-transparent z-40">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Quick Prompts - Elegant Pills */}
        {prompts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
            {prompts.map(prompt => (
              <button
                key={prompt.id}
                onClick={() => setInput(prompt.content)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-lg whitespace-nowrap hover:bg-white dark:hover:bg-zinc-800 transition-all border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <Sparkles size={12} className="text-indigo-500" />
                {prompt.label}
              </button>
            ))}
          </div>
        )}

        <div className="relative group">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-4 flex gap-3 p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
              {attachments.map(att => (
                <div key={att.id} className="relative group shrink-0 transition-transform hover:scale-105">
                  {att.type === 'image' ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-white dark:border-zinc-800 shadow-md bg-zinc-100">
                      <img src={att.preview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border border-white dark:border-zinc-800 bg-white dark:bg-zinc-800 shadow-md flex flex-col items-center justify-center p-2 text-center">
                      <FileIcon size={24} className="text-indigo-500 mb-1" />
                      <span className="text-[10px] text-zinc-500 truncate w-full font-medium">{att.file?.name || t('common.unnamed')}</span>
                    </div>
                  )}
                  <button onClick={() => onRemoveAttachment(att.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="relative flex items-end gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl shadow-indigo-500/5 rounded-lg p-2 pr-4 transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50">
            <Tooltip content={t('common.ai.assistant.upload')}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
              >
                <Paperclip size={20} />
              </button>
            </Tooltip>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={onFileSelect} accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json,.ts,.js,.tsx" />
            
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendCurrent(); } }}
              placeholder={t('common.ai.assistant.chatPlaceholder', { name: activeAgent?.name || 'AI' })}
              rows={1}
              className="flex-1 py-3.5 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 border-none focus:ring-0 outline-none resize-none max-h-48 min-h-[52px] text-[15px] leading-relaxed"
            />

            <div className="flex items-center gap-2 pb-1.5">
              <Tooltip content={t('common.ai.assistant.optimize')}>
                <button 
                  onClick={async () => {
                    if (isOptimizing || !input.trim()) return;
                    setIsOptimizing(true);
                    try {
                      const next = await onOptimize(input);
                      if (typeof next === 'string') setInput(next);
                    } finally {
                      setIsOptimizing(false);
                    }
                  }}
                  disabled={isOptimizing || !input.trim()}
                  className={`p-2.5 rounded-lg transition-all ${isOptimizing ? 'text-indigo-600 bg-indigo-50 animate-pulse' : 'text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                >
                  {isOptimizing ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                </button>
              </Tooltip>
              
              <button
                onClick={sendCurrent}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="w-11 h-11 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

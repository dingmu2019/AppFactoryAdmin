
import React, { useState } from 'react';
import { User, Copy, Camera, Download, Check, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tooltip } from "@/components/Tooltip";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useI18n } from '@/contexts';

interface DebateMessageItemProps {
  msg: any;
  debate: any;
  expandedThinking: Record<string, boolean>;
  setExpandedThinking: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showThinking: boolean;
  onCopy: (content: string) => void;
  onScreenshot: (id: string) => void;
  onExportPDF: (msg: any) => void;
}

export const DebateMessageItem: React.FC<DebateMessageItemProps> = ({
  msg,
  debate,
  expandedThinking,
  setExpandedThinking,
  showThinking,
  onCopy,
  onScreenshot,
  onExportPDF,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const isSystem = msg.agent_name === 'System';

  const handleScreenshot = async () => {
    setIsCapturing(true);
    try {
        await onScreenshot(`message-${msg.id}`);
    } finally {
        setIsCapturing(false);
    }
  };
  
  // Try to parse content as JSON (internal_monologue + public_speech)
  let content = msg.content;
  let internalMonologue = null;
  
  // 1. Try JSON
  try {
      let jsonStr = msg.content.trim();
      // Handle "内部独白" prefix which might be added by some legacy logic or specific agent output
      if (jsonStr.includes('内部独白')) {
          jsonStr = jsonStr.replace(/^[•\s]*内部独白\s*/, '');
      }
      
      if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const json = JSON.parse(jsonStr);
      // Support multiple key formats
      content = json.public_speech || json.speech || json.content || content;
      internalMonologue = json.internal_monologue || json.thought || json.analysis || null;
  } catch (e) {
      // 2. Fallback: Try Legacy HTML Pattern
      if (typeof msg.content === 'string' && msg.content.includes('<details')) {
          const match = msg.content.match(/<details[\s\S]*?<\/summary>([\s\S]*?)<\/details>([\s\S]*)/);
          if (match && match[2]) {
              internalMonologue = match[1].trim();
              content = match[2].trim();
          }
      }
  }

  // --- HACK: Hide raw JSON if it looks like orchestration but slipped through (e.g. alignment message) ---
  if (typeof content === 'string' && content.trim().startsWith('{"type":"alignment"')) {
      return null; // Don't render raw JSON for alignment messages that weren't caught by page.tsx
  }
  if (typeof content === 'string' && content.trim().startsWith('{"type":"orchestration"')) {
      return null; // Don't render raw JSON for orchestration messages that weren't caught by page.tsx
  }

  const handleCopy = () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 ${isSystem ? 'justify-center' : ''}`}>
      {!isSystem && (
        <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm flex-shrink-0">
          <AgentAvatar name={debate.participants?.find((p: any) => p.name === msg.agent_name)?.avatar} size={20} fallback={<User size={18} />} />
        </div>
      )}
      
      <div className={`max-w-[80%] ${isSystem ? 'w-full max-w-2xl' : ''}`}>
        {!isSystem && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{msg.agent_name}</span>
            <span className="text-[10px] text-zinc-400">{msg.role}</span>
          </div>
        )}
        
        <div className={`rounded-lg p-5 shadow-sm text-sm leading-relaxed relative group ${
            isSystem 
            ? 'bg-transparent text-zinc-500 dark:text-zinc-400 text-center italic text-xs py-2 w-full'
            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
          }`} id={`message-${msg.id}`}>
            {!isSystem && (
            <div className="flex items-center gap-1.5 px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute -bottom-8 left-0 z-10">
              <Tooltip content={t('common.copy')}>
                <button onClick={handleCopy} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.screenshot')}>
                <button 
                  onClick={handleScreenshot} 
                  disabled={isCapturing}
                  className={`p-1.5 rounded-lg transition-all ${
                    isCapturing 
                      ? 'text-indigo-600 bg-zinc-100 dark:bg-zinc-800' 
                      : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.exportPDF')}>
                <button onClick={() => onExportPDF(msg)} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                  <Download size={14} />
                </button>
              </Tooltip>
            </div>
          )}

          <>
            {showThinking && internalMonologue && (
              <div className="relative mb-3">
                <button 
                  onClick={() => setExpandedThinking(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                  className="flex items-center gap-2 text-[10px] text-indigo-500 hover:text-indigo-600 font-medium select-none cursor-pointer group/thinking"
                >
                  <div className={`w-1.5 h-1.5 rounded-full bg-indigo-500 ${expandedThinking[msg.id] ? '' : 'animate-pulse'}`} />
                  <span>
                    {expandedThinking[msg.id] ? t('common.ai.assistant.hideInternalMonologue') : t('common.ai.assistant.internalMonologue')}
                  </span>
                </button>
                {expandedThinking[msg.id] && (
                  <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-xs italic text-zinc-500 animate-in fade-in slide-in-from-top-1 duration-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{internalMonologue}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {isSystem && msg.is_summary_report ? (
                <div className="markdown-body text-left not-italic">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>
            ) : (
                <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>
            )}

            {/* Token Usage Display */}
            {!isSystem && (msg.prompt_tokens || msg.completion_tokens) && (
              <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-700/50 flex gap-3 text-[10px] text-zinc-400 font-medium opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  <span>Input:</span>
                  <span className="text-zinc-600 dark:text-zinc-300">{msg.prompt_tokens || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Output:</span>
                  <span className="text-zinc-600 dark:text-zinc-300">{msg.completion_tokens || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Total:</span>
                  <span className="text-indigo-500 font-bold">{(msg.prompt_tokens || 0) + (msg.completion_tokens || 0)}</span>
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

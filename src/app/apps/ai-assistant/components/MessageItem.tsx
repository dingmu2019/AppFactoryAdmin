
import React, { useState } from 'react';
import { User, Copy, Save, Trash2, Camera, FileText, Download, ThumbsUp, ThumbsDown, Loader2, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tooltip } from '../../../../components/Tooltip';
import { AgentAvatar } from '../../../../components/AgentAvatar';
import CodeBlock from './markdown/CodeBlock';
import MermaidDiagram from './markdown/MermaidDiagram';
import { useI18n } from '../../../../contexts';
import type { Message, Agent } from '../types';

interface MessageItemProps {
  msg: Message;
  activeAgent: Agent | null;
  isCapturing: string | null;
  isExportingPDF: string | null;
  isExportingWord: string | null;
  onCopy: (content: string) => void;
  onSavePrompt: (content: string) => void;
  onDelete: (id: string) => void;
  onScreenshot: (id: string) => void;
  onExportPDF: (id: string) => void;
  onExportWord: (id: string) => void;
  onFeedback: (id: string, type: 'like' | 'dislike') => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  msg,
  activeAgent,
  isCapturing,
  isExportingPDF,
  isExportingWord,
  onCopy,
  onSavePrompt,
  onDelete,
  onScreenshot,
  onExportPDF,
  onExportWord,
  onFeedback,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  const handleCopy = () => {
    onCopy(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse System2 Thinking (Internal Monologue)
  let displayContent = msg.content;
  let internalMonologue = null;
  try {
      const jsonStr = msg.content.trim();
      if ((jsonStr.startsWith('{') && jsonStr.endsWith('}')) || jsonStr.includes('internal_monologue') || jsonStr.includes('public_speech')) {
          let cleanJson = jsonStr;
          if (cleanJson.startsWith('```json')) {
              cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanJson.startsWith('```')) {
              cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          const json = JSON.parse(cleanJson);
          displayContent = json.public_speech || json.speech || json.content || msg.content;
          internalMonologue = json.internal_monologue || json.thought || json.analysis || null;
      }
  } catch (e) {}

  return (
    <div id={`msg-${msg.id}`} className={`flex gap-6 group animate-in fade-in slide-in-from-bottom-4 duration-700 ${msg.role === 'user' ? 'flex-row-reverse' : 'items-start'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg transition-transform duration-500 group-hover:scale-110 ${
        msg.role === 'user' 
          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' 
          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400'
      }`}>
        {msg.role === 'user' ? <User size={20} /> : <AgentAvatar name={activeAgent?.avatar} size={24} />}
      </div>
      
      <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-3 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {msg.role === 'user' ? 'You' : activeAgent?.name}
          </span>
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        <div className={`relative px-6 py-2.5 transition-all duration-500 ai-message-bubble ${
          msg.role === 'user'
            ? 'bg-indigo-600 text-white rounded-lg rounded-tr-none shadow-xl shadow-indigo-500/10'
            : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg rounded-tl-none border border-zinc-200 dark:border-zinc-800 shadow-sm'
        }`}>
          <div className={`markdown-body max-w-none break-words text-[15px] leading-snug selection:bg-indigo-200 dark:selection:bg-indigo-500/30 ${msg.role === 'user' ? '[&_*]:text-white' : ''}`}>
            {/* System2 Thinking */}
            {msg.role !== 'user' && internalMonologue && (
              <div className="mb-4 border-l-2 border-indigo-500/30 pl-4 py-1">
                <button 
                  onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                  className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2 hover:text-indigo-600 transition-colors"
                >
                  <div className={`w-1.5 h-1.5 rounded-full bg-indigo-500 ${isThinkingExpanded ? '' : 'animate-pulse'}`} />
                  {isThinkingExpanded ? t('common.ai.assistant.hideInternalMonologue') : t('common.ai.assistant.internalMonologue')}
                </button>
                {isThinkingExpanded && (
                  <div className="text-xs italic text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{internalMonologue}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {msg.attachments.map((att, idx) => (
                  <div key={idx} className="overflow-hidden rounded-lg border border-white/20 shadow-sm transition-transform hover:scale-[1.02]">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="w-48 h-32 object-cover cursor-zoom-in" onClick={() => window.open(att.url, '_blank')} />
                    ) : (
                      <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-md">
                        <FileText size={20} className={msg.role === 'user' ? 'text-white' : 'text-indigo-500'} />
                        <div className="text-xs">
                          <div className="font-semibold truncate max-w-[150px]">{att.name}</div>
                          <div className="opacity-60">Click to view</div>
                        </div>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({node, ...props}: any) => <a className="text-indigo-500 underline decoration-indigo-500/30 underline-offset-4 hover:decoration-indigo-500 transition-all" target="_blank" {...props} />,
                table: ({node, ...props}: any) => <table className="w-full text-sm my-6 border-collapse" {...props} />,
                pre: ({ children }: any) => <>{children}</>,
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isMermaid = match && match[1] === 'mermaid';
                  const value = String(children).replace(/\n$/, '');
                  if (isMermaid) return <MermaidDiagram chart={value} />;
                  if (match) return <CodeBlock language={match[1]} value={value} />;
                  return <code className="px-1.5 py-0.5 rounded-md bg-zinc-200/50 dark:bg-zinc-800/50 text-indigo-600 dark:text-indigo-400 font-mono text-[0.9em]" {...props}>{children}</code>;
                }
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>

          {/* Token Usage Display */}
          {(msg.prompt_tokens || msg.completion_tokens) ? (
            <div className={`mt-3 pt-2 border-t text-[10px] font-medium tracking-tight flex gap-3 opacity-40 group-hover:opacity-100 transition-opacity ${
              msg.role === 'user' ? 'border-white/10 text-white/80' : 'border-zinc-100 dark:border-zinc-800 text-zinc-400'
            }`}>
              <div className="flex items-center gap-1">
                <span>Input:</span>
                <span className="font-bold">{msg.prompt_tokens || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Output:</span>
                <span className="font-bold">{msg.completion_tokens || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Total:</span>
                <span className="font-bold">{(msg.prompt_tokens || 0) + (msg.completion_tokens || 0)}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions below the bubble */}
        <div className={`flex items-center gap-1.5 px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-300 ${msg.role === 'user' ? 'flex-row justify-start' : 'flex-row justify-end'}`}>
          {msg.role === 'user' ? (
            <>
              <Tooltip content={t('common.ai.assistant.copy')}>
                <button onClick={handleCopy} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.saveToPrompts')}>
                <button onClick={() => onSavePrompt(msg.content)} className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                  <Save size={14} />
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.delete')}>
                <button onClick={() => onDelete(msg.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip content={t('common.ai.assistant.copy')}>
                <button onClick={handleCopy} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.delete')}>
                <button onClick={() => onDelete(msg.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.screenshot')}>
                <button 
                  onClick={() => onScreenshot(`msg-${msg.id}`)} 
                  disabled={isCapturing === msg.id}
                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                    isCapturing === msg.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-90' 
                      : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isCapturing === msg.id ? (
                    <div className="relative">
                      <Camera size={14} className="opacity-30" />
                      <Loader2 size={10} className="absolute inset-0 m-auto animate-spin" />
                    </div>
                  ) : <Camera size={14} />}
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.exportPDF')}>
                <button 
                  onClick={() => onExportPDF(msg.id)} 
                  disabled={isExportingPDF === msg.id}
                  className={`p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all ${isExportingPDF === msg.id ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
                >
                  {isExportingPDF === msg.id ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <FileText size={14} />}
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.exportWord')}>
                <button 
                  onClick={() => onExportWord(msg.id)} 
                  disabled={isExportingWord === msg.id}
                  className={`p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all ${isExportingWord === msg.id ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
                >
                  {isExportingWord === msg.id ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <Download size={14} />}
                </button>
              </Tooltip>
              <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 mx-1" />
              <Tooltip content={t('common.ai.assistant.like')}>
                <button 
                  onClick={() => onFeedback(msg.id, 'like')}
                  className={`p-1.5 rounded-lg transition-all ${msg.feedback === 'like' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  <ThumbsUp size={14} fill={msg.feedback === 'like' ? 'currentColor' : 'none'} />
                </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.dislike')}>
                <button 
                  onClick={() => onFeedback(msg.id, 'dislike')}
                  className={`p-1.5 rounded-lg transition-all ${msg.feedback === 'dislike' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' : 'text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  <ThumbsDown size={14} fill={msg.feedback === 'dislike' ? 'currentColor' : 'none'} />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

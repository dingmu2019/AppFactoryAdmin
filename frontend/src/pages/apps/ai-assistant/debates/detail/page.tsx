
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, StopCircle, CheckCircle, AlertTriangle, User, FileText, Copy, Camera, Download, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { toPng } from 'html-to-image';
import { renderToStaticMarkup } from 'react-dom/server';
import { useToast, useI18n } from '../../../../../contexts';
import { supabase } from '../../../../../lib/supabase';
import { ConfirmModal } from '../../../../../components/ConfirmModal';
import { Tooltip } from '../../../../../components/Tooltip';
import { AgentAvatar } from '../../../../../components/AgentAvatar';

interface DebateDetail {
  id: string;
  topic: string;
  mode: string;
  status: string;
  participants: any[];
  summary: string;
  messages: any[];
  started_at: string;
  duration_limit: number;
}

export default function DebateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [debate, setDebate] = useState<DebateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const fetchDetail = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Use API instead of direct Supabase to get messages joined easily or custom logic
      // Or stick to Supabase if simple. The backend route /api/ai/debates/:id returns joined messages.
      const response = await fetch(`/api/ai/debates/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      
      // Inject Summary as a System Message if completed and summary exists
      // This makes it appear in the chat flow naturally
      if (data.summary && data.status === 'completed') {
          const hasSummaryMsg = data.messages.some((m: any) => m.is_summary_report);
          if (!hasSummaryMsg) {
              data.messages.push({
                  id: 'summary-report-msg',
                  agent_name: 'System',
                  role: 'Judge',
                  content: `**Summary Report**\n\n${data.summary}`,
                  is_summary_report: true,
                  created_at: new Date().toISOString() // Put it at the end
              });
          }
      }
      
      setDebate(data);
      
      return data;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    
    // Start polling if running
    pollingInterval.current = setInterval(async () => {
        const data = await fetchDetail();
        if (data && (data.status === 'completed' || data.status === 'terminated' || data.status === 'error')) {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        }
    }, 3000); // Poll every 3s

    return () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [id]);

  useLayoutEffect(() => {
    if (isAtBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debate?.messages]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Tolerance of 100px
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (debate?.status === 'running' && debate.started_at && debate.duration_limit) {
      const updateTimer = () => {
        const startTime = new Date(debate.started_at).getTime();
        const durationMs = debate.duration_limit * 60 * 1000;
        const endTime = startTime + durationMs;
        const now = Date.now();
        const diff = endTime - now;

        if (diff <= 0) {
          setTimeLeft('00:00');
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };

      updateTimer(); // Initial call
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [debate?.status, debate?.started_at, debate?.duration_limit]);

  const handleCopySummary = () => {
    if (!debate?.summary) return;
    navigator.clipboard.writeText(debate.summary);
    showToast(t('common.ai.assistant.copySuccess'), 'success');
  };

  const handleExportPDF = () => {
      if (!debate?.summary) return;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          showToast('Please allow popups', 'error');
          return;
      }

      const element = document.getElementById('debate-summary-markdown');
      const contentHtml = element ? element.innerHTML : `<pre>${debate.summary}</pre>`;

      printWindow.document.write(`
        <html>
          <head>
            <title>Debate Summary Report - ${debate.topic}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; }
              @media print {
                @page { margin: 20mm; size: A4; }
                body { padding: 0; }
              }
              h1, h2, h3 { color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; }
              h1 { font-size: 2em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
              h2 { font-size: 1.5em; }
              h3 { font-size: 1.25em; }
              p { line-height: 1.6; margin-bottom: 1em; }
              ul, ol { margin-bottom: 1em; padding-left: 2em; }
              li { margin-bottom: 0.25em; }
              blockquote { border-left: 4px solid #e2e8f0; padding-left: 1em; color: #64748b; font-style: normal; }
              code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
              pre { background: #f8fafc; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
              pre code { background: transparent; padding: 0; }
              strong { color: #0f172a; font-weight: 600; }
            </style>
          </head>
          <body>
            <h1>Summary Report</h1>
            <p><strong>Topic:</strong> ${debate.topic}</p>
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <div class="content">
              ${contentHtml}
            </div>
            <script>
              window.onload = () => {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handleScreenshotChat = async () => {
    const element = document.getElementById('debate-chat-content');
    if (!element) return;
    
    try {
        showToast(t('common.loading'), 'info');
        // Create a clone to expand full height for capture
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.height = 'auto';
        clone.style.overflow = 'visible';
        clone.style.position = 'absolute';
        clone.style.top = '-10000px';
        clone.style.left = '0';
        clone.style.width = `${element.clientWidth}px`;
        clone.style.background = document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc';
        document.body.appendChild(clone);

        const dataUrl = await toPng(clone, {
            cacheBust: true,
            backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc',
            style: { padding: '40px' } 
        });
        
        document.body.removeChild(clone);
        
        const blob = await (await fetch(dataUrl)).blob();
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast(t('common.ai.assistant.copySuccess'), 'success');
    } catch (error) {
        console.error('Screenshot failed:', error);
        showToast(t('common.error'), 'error');
    }
  };

  const handleExportPDFChat = () => {
      const element = document.getElementById('debate-chat-content');
      if (!element) return;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          showToast('Please allow popups', 'error');
          return;
      }

      // Get HTML content - we need to preserve the structure but maybe simplify classes for print
      // We will rely on inline styles or a print stylesheet injected into the new window.
      // Since we use Tailwind, we can't easily copy all styles.
      // We will construct a print-friendly version of the chat.
      
      const messages = debate?.messages.map((msg: any) => {
          const isSystem = msg.agent_name === 'System';
          const avatar = debate?.participants?.find((p: any) => p.name === msg.agent_name)?.avatar || '👤';
          
          return `
            <div class="message ${isSystem ? 'system' : 'agent'}">
                ${!isSystem ? `
                    <div class="avatar">${avatar}</div>
                    <div class="bubble-container">
                        <div class="meta">
                            <span class="name">${msg.agent_name}</span>
                            <span class="role">${msg.role}</span>
                        </div>
                        <div class="bubble">
                            ${renderToStaticMarkup(
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ` : `
                    <div class="system-bubble">
                        ${msg.content}
                    </div>
                `}
            </div>
          `;
      }).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>Debate Log - ${debate?.topic}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; background: #fff; }
              @media print {
                @page { margin: 20mm; size: A4; }
                body { padding: 0; }
              }
              h1 { font-size: 24px; margin-bottom: 10px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .meta-header { font-size: 14px; color: #64748b; margin-bottom: 30px; }
              
              .message { display: flex; margin-bottom: 24px; page-break-inside: avoid; }
              .message.system { justify-content: center; margin: 30px 0; }
              
              .avatar { width: 40px; height: 40px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; flex-shrink: 0; border: 1px solid #e2e8f0; }
              
              .bubble-container { flex: 1; max-width: 100%; }
              .meta { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; }
              .name { font-weight: 700; font-size: 14px; color: #334155; }
              .role { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
              
              .bubble { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 14px; line-height: 1.6; color: #334155; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
              .system-bubble { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 10px 24px; font-size: 13px; color: #64748b; font-style: italic; text-align: center; display: inline-block; }
              
              /* Markdown Styles */
              .bubble p { margin-bottom: 10px; }
              .bubble p:last-child { margin-bottom: 0; }
              .bubble ul, .bubble ol { margin-bottom: 10px; padding-left: 20px; }
              .bubble code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #0f172a; }
              .bubble pre { background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 8px; overflow-x: auto; margin-bottom: 10px; }
              .bubble pre code { background: transparent; color: inherit; padding: 0; }
              .bubble blockquote { border-left: 3px solid #cbd5e1; padding-left: 12px; color: #64748b; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>${debate?.topic}</h1>
            <div class="meta-header">
                Date: ${new Date(debate?.started_at || '').toLocaleString()} | Mode: ${debate?.mode} | Status: ${debate?.status}
            </div>
            <div class="chat-content">
              ${document.getElementById('debate-chat-content')?.innerHTML} 
            </div>
            <script>
               // Clean up the copied HTML if needed, or use the reconstructed string above
               // Actually, using innerHTML of the React component might lose styles because Tailwind classes are not present in the print CSS.
               // Let's use the reconstructed HTML string 'messages' which uses standard classes defined in <style>.
               document.querySelector('.chat-content').innerHTML = \`${messages}\`;
               
               window.onload = () => {
                 setTimeout(() => window.print(), 500);
               }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handleStop = async () => {
      setConfirmModal({
          isOpen: true,
          title: t('common.ai.debatesPage.detail.stop'),
          message: t('common.ai.debatesPage.detail.stopConfirm'),
          onConfirm: async () => {
              setIsStopping(true);
              try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const token = session?.access_token;
                  
                  await fetch(`/api/ai/debates/${id}/stop`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                  });
                  
                  showToast(t('common.ai.debatesPage.status.terminated'), 'success');
                  fetchDetail();
              } catch (error) {
                  showToast(t('common.error'), 'error');
              } finally {
                  setIsStopping(false);
              }
          }
      });
  };

  const handleDelete = async () => {
      setConfirmModal({
          isOpen: true,
          title: t('common.confirmDelete'),
          message: t('common.ai.debatesPage.deleteConfirm'),
          onConfirm: async () => {
              setIsDeleting(true);
              try {
                  const nowIso = new Date().toISOString();
                  const { data, error } = await supabase
                    .from('agent_debates')
                    .update({ deleted_at: nowIso, updated_at: nowIso })
                    .eq('id', id)
                    .is('deleted_at', null)
                    .select('id')
                    .single();

                  if (error || !data) {
                    throw new Error(error?.message || 'Delete failed');
                  }

                  showToast(t('common.success'), 'success');
                  navigate('/ai-debates');
              } catch (error: any) {
                  showToast(error.message || t('common.error'), 'error');
              } finally {
                  setIsDeleting(false);
              }
          }
      });
  };

  if (isLoading && !debate) {
      return <div className="p-10 text-center text-slate-400">{t('common.loading')}</div>;
  }

  if (!debate) {
      return <div className="p-10 text-center text-slate-400">{t('common.ai.debatesPage.noData')}</div>;
  }

  const isRunning = debate.status === 'running';

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-4">
              <button onClick={() => navigate('/ai-debates')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h2 className="font-bold text-slate-900 dark:text-white truncate max-w-md">{debate.topic}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="capitalize">{debate.mode.replace('_', ' ')}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
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
              <Tooltip content={t('common.ai.assistant.screenshot')}>
                  <button onClick={handleScreenshotChat} className="p-2 text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors">
                      <Camera size={18} />
                  </button>
              </Tooltip>
              <Tooltip content={t('common.ai.assistant.exportPDF')}>
                  <button onClick={handleExportPDFChat} className="p-2 text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors">
                      <Download size={18} />
                  </button>
              </Tooltip>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors font-medium text-sm"
              >
                  <Trash2 size={16} />
                  {t('common.delete')}
              </button>
              {isRunning && (
                  <button 
                    onClick={handleStop}
                    disabled={isStopping}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors font-medium text-sm"
                  >
                      <StopCircle size={16} />
                      {t('common.ai.debatesPage.detail.stop')}
                  </button>
              )}
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Main Chat */}
          <div 
            id="debate-chat-content" 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950"
          >
              {debate.messages.map((msg: any) => {
                    const isSummaryMessage = msg.is_summary_report || (debate.summary && msg.content.includes(debate.summary.substring(0, 100)));
                    
                    if (isSummaryMessage) {
                        return (
                            <div key={msg.id} className="flex justify-center my-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-900/30 overflow-hidden ring-1 ring-indigo-500/10">
                                    {/* Report Header */}
                                    <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-6 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <FileText size={120} />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2 relative z-10 flex items-center gap-3">
                                            <CheckCircle className="text-emerald-300" size={28} />
                                            {t('common.ai.debatesPage.detail.summary')}
                                        </h3>
                                        <p className="text-indigo-100 relative z-10 opacity-90">
                                            Based on {debate.messages.length - 1} interactions | Duration: {Math.ceil(debate.duration_limit)} min
                                        </p>
                                    </div>
                                    
                                    {/* Report Content */}
                                    <div className="p-8">
                                        <div id="debate-summary-markdown" className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-indigo-900 dark:prose-headings:text-indigo-300 prose-p:text-slate-600 dark:prose-p:text-slate-300">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[rehypeRaw]}
                                                components={{
                                                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold border-b border-slate-100 pb-2 mb-4" {...props} />,
                                                    h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3 flex items-center gap-2 before:content-[''] before:w-1 before:h-6 before:bg-indigo-500 before:rounded-full before:mr-2" {...props} />,
                                                    blockquote: ({node, ...props}) => <blockquote className="bg-slate-50 dark:bg-slate-800/50 border-l-4 border-indigo-400 p-4 rounded-r-lg italic text-slate-600 dark:text-slate-400 my-4" {...props} />,
                                                    strong: ({node, ...props}) => <strong className="font-bold text-indigo-700 dark:text-indigo-400" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 marker:text-indigo-500" {...props} />,
                                                    li: ({node, ...props}) => <li className="pl-1" {...props} />
                                                }}
                                            >
                                                {debate.summary || msg.content.replace('**Summary Report**', '')}
                                            </ReactMarkdown>
                                        </div>
                                        
                                        {/* Actions Footer */}
                                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                            <button onClick={handleCopySummary} className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors text-sm font-medium">
                                                <Copy size={16} /> Copy
                                            </button>
                                            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-lg shadow-indigo-500/20">
                                                <Download size={16} /> Export PDF
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // If this is a duplicate summary message (not is_summary_report but contains the summary content), skip rendering it as a regular message
                    if (debate.summary && msg.content.includes(debate.summary.substring(0, 100)) && !msg.is_summary_report) {
                        return null;
                    }
                    
                    return (
                    <div key={msg.id} className={`flex gap-4 ${msg.agent_name === 'System' ? 'justify-center' : ''}`}>
                        {msg.agent_name !== 'System' && (
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm flex-shrink-0">
                                {/* Try to find avatar from participants */}
                                <AgentAvatar name={debate.participants?.find((p: any) => p.name === msg.agent_name)?.avatar} size={20} fallback={<User size={18} />} />
                            </div>
                        )}
                        
                        <div className={`max-w-[80%] ${msg.agent_name === 'System' ? 'w-full max-w-2xl' : ''}`}>
                            {msg.agent_name !== 'System' && (
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{msg.agent_name}</span>
                                    <span className="text-[10px] text-slate-400">{msg.role}</span>
                                </div>
                            )}
                            
                            <div className={`rounded-2xl p-5 shadow-sm text-sm leading-relaxed relative group ${
                                msg.agent_name === 'System' 
                                ? 'bg-transparent text-slate-500 dark:text-slate-400 text-center italic text-xs py-2'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`} id={`message-${msg.id}`}>
                                {/* Message Actions */}
                                {msg.agent_name !== 'System' && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute -bottom-8 left-0 z-10">
                                        <Tooltip content={t('common.copy')}>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(msg.content);
                                                    showToast(t('common.ai.assistant.copySuccess'), 'success');
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={t('common.ai.assistant.screenshot')}>
                                            <button 
                                                onClick={async () => {
                                                    const el = document.getElementById(`message-${msg.id}`);
                                                    if (!el) return;
                                                    
                                                    try {
                                                        const dataUrl = await toPng(el, {
                                                            cacheBust: true,
                                                            backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                                                            style: { margin: '0', transform: 'none' }
                                                        });
                                                        const blob = await (await fetch(dataUrl)).blob();
                                                        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                                        showToast(t('common.ai.assistant.copySuccess'), 'success');
                                                    } catch (e) {
                                                        console.error(e);
                                                        showToast('Screenshot failed', 'error');
                                                    }
                                                }} 
                                                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                            >
                                                <Camera size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={t('common.ai.assistant.exportPDF')}>
                                            <button 
                                                onClick={() => {
                                                    const printWindow = window.open('', '_blank');
                                                    if (!printWindow) return;
                                                    
                                                    // Render markdown to HTML string for print
                                                    const contentHtml = renderToStaticMarkup(
                                                        <div className="markdown-body">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    );
                                                    
                                                    printWindow.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>Message Export</title>
                                                                <style>
                                                                    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #334155; line-height: 1.6; }
                                                                    .markdown-body p { margin-bottom: 1em; }
                                                                    .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 1em; }
                                                                    .markdown-body code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
                                                                    .markdown-body pre { background: #1e293b; color: #f8fafc; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
                                                                    .markdown-body pre code { background: transparent; padding: 0; color: inherit; }
                                                                    .markdown-body blockquote { border-left: 4px solid #cbd5e1; padding-left: 1em; color: #64748b; margin: 1em 0; }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                ${contentHtml}
                                                                <script>
                                                                    window.onload = () => { window.print(); }
                                                                </script>
                                                            </body>
                                                        </html>
                                                    `);
                                                    printWindow.document.close();
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                )}

                                {(() => {
                                    // Try to parse content as JSON (internal_monologue + public_speech)
                                    let content = msg.content;
                                    let internalMonologue = null;
                                    
                                    try {
                                        // Handle cases where content might be wrapped in code blocks
                                        let jsonStr = msg.content;
                                        if (jsonStr.startsWith('```json')) {
                                            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                                        } else if (jsonStr.startsWith('```')) {
                                            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
                                        }
                                        
                                        const json = JSON.parse(jsonStr);
                                        if (json.public_speech) {
                                            content = json.public_speech;
                                            internalMonologue = json.internal_monologue;
                                        }
                                    } catch (e) {
                                        // Not valid JSON, treat as plain text
                                    }

                                    return (
                                        <>
                                            {internalMonologue && (
                                                <div className="relative mb-3">
                                                    <button 
                                                        onClick={() => setExpandedThinking(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                                        className="flex items-center gap-2 text-[10px] text-indigo-500 hover:text-indigo-600 font-medium select-none cursor-pointer group/thinking"
                                                    >
                                                        <div className={`w-1.5 h-1.5 rounded-full bg-indigo-500 ${expandedThinking[msg.id] ? '' : 'animate-pulse'}`} />
                                                        <span>{expandedThinking[msg.id] ? 'Hide Internal Monologue' : 'Internal Monologue'}</span>
                                                        <span className="text-[8px] opacity-0 group-hover/thinking:opacity-100 transition-opacity">(Click to {expandedThinking[msg.id] ? 'collapse' : 'expand'})</span>
                                                    </button>
                                                    
                                                    {expandedThinking[msg.id] && (
                                                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs italic text-slate-500 animate-in fade-in slide-in-from-top-1 duration-300">
                                                            {internalMonologue}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Legacy format: <details> */}
                                            {content.includes('<details') ? (
                                              <div className="relative">
                                                  {/* Ambient Indicator for Thought Process */}
                                                  <button 
                                                    onClick={() => setExpandedThinking(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                                    className="mb-3 flex items-center gap-2 text-[10px] text-indigo-500 hover:text-indigo-600 font-medium select-none cursor-pointer group/thinking"
                                                  >
                                                      <div className={`w-1.5 h-1.5 rounded-full bg-indigo-500 ${expandedThinking[msg.id] ? '' : 'animate-pulse'}`} />
                                                      <span>{expandedThinking[msg.id] ? 'Hide Thinking Process' : 'System Thinking Processed'}</span>
                                                      <span className="text-[8px] opacity-0 group-hover/thinking:opacity-100 transition-opacity">(Click to {expandedThinking[msg.id] ? 'collapse' : 'expand'})</span>
                                                  </button>
                                                  
                                                  {/* Main Content (Strip the <details> block for clean UI) */}
                                                  <div className="markdown-body">
                                                      <ReactMarkdown 
                                                          remarkPlugins={[remarkGfm]}
                                                          rehypePlugins={[rehypeRaw]}
                                                          components={{
                                                              // Hide the details block completely in UI if not expanded
                                                              details: ({children}) => expandedThinking[msg.id] ? (
                                                                  <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs italic text-slate-500 animate-in fade-in slide-in-from-top-1 duration-300">
                                                                      {children}
                                                                  </div>
                                                              ) : null 
                                                          }}
                                                      >
                                                          {content}
                                                      </ReactMarkdown>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="markdown-body">
                                                  <ReactMarkdown 
                                                      remarkPlugins={[remarkGfm]}
                                                      rehypePlugins={[rehypeRaw]}
                                                  >
                                                      {content}
                                                  </ReactMarkdown>
                                              </div>
                                          )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

          {/* Right Sidebar - Info Only */}
          <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
              <div className="p-6 space-y-8">
                  {/* Status Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 text-center text-slate-400 text-sm">
                      {debate.status === 'running' ? (
                          <div className="flex flex-col items-center gap-3 py-2">
                              <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                              <div className="text-center">
                                  <div className="text-slate-700 dark:text-slate-300 font-medium mb-1">{t('common.ai.debatesPage.detail.running')}</div>
                                  {timeLeft && (
                                    <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 my-2">
                                      {timeLeft}
                                    </div>
                                  )}
                                  <div className="text-xs text-slate-400">{t('common.ai.debatesPage.detail.waitSummary')}</div>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-2">
                              <CheckCircle size={32} className="text-emerald-500 mb-2" />
                              <div className="font-medium text-slate-900 dark:text-white">Debate Completed</div>
                              <div className="text-xs">Summary report has been generated in the chat timeline.</div>
                          </div>
                      )}
                  </div>

                  {/* Participants */}
                  <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider text-opacity-70">
                          {t('common.ai.debatesPage.detail.participants')} ({debate.participants?.length || 0})
                      </h3>
                      <div className="space-y-3">
                          {debate.participants?.map((p: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                      <AgentAvatar name={p.avatar} size={20} />
                                  </div>
                                  <div>
                                      <div className="font-medium text-sm text-slate-900 dark:text-white">{p.name}</div>
                                      <div className="text-xs text-slate-500">{p.role}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

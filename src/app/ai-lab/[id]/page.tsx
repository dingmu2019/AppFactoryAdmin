'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, FileText, Copy, Download, Code, Cpu, Database, Server, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { renderToStaticMarkup } from 'react-dom/server';
import { useToast, useI18n } from '@/contexts';
import { supabase } from '@/lib/supabase';

interface LabMessage {
  id: string;
  agent_name: string;
  agent_role: string;
  content: {
    thought?: string;
    speech: string;
    artifacts?: any[];
  };
  round_index: number;
  created_at: string;
}

interface LabArtifact {
    id: string;
    title: string;
    type: string;
    content: string;
    created_at: string;
}

interface LabSession {
  id: string;
  title: string;
  mode: string;
  status: string;
  config: any;
}

export default function AILabDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useI18n();
  
  const [session, setSession] = useState<LabSession | null>(null);
  const [messages, setMessages] = useState<LabMessage[]>([]);
  const [artifacts, setArtifacts] = useState<LabArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchDetails = async () => {
    if (!id) return;

    try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) return;

        const response = await fetch(`/api/ai/lab/sessions/${id}`, {
            headers: { 'Authorization': `Bearer ${authSession.access_token}` }
        });
        
        if (!response.ok) throw new Error(t('common.loadFailed'));
        
        const data = await response.json();
        setSession(data.session);
        setMessages(data.messages);
        setArtifacts(data.artifacts);
    } catch (error) {
        console.error(error);
        showToast(t('common.loadFailed'), 'error');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    
    // Poll for updates if running
    const interval = setInterval(() => {
        if (session?.status === 'active') {
            fetchDetails();
        }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [id, session?.status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t('common.copySuccess'), 'success');
  };

  const handleArtifactScreenshot = async (artifactId: string) => {
      try {
          const node = document.getElementById(`artifact-content-${artifactId}`);
          if (!node) return;
          showToast(t('common.processing'), 'info');
          const { toPng } = await import('html-to-image');
          // Use white background for screenshot
          const dataUrl = await toPng(node, { backgroundColor: '#ffffff', pixelRatio: 2 });
          
          // Copy to clipboard
          const blob = await (await fetch(dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast(t('common.copySuccess'), 'success');
      } catch (error) {
          console.error(error);
          showToast(t('common.error'), 'error');
      }
  };

  const handleArtifactPDF = (artifact: LabArtifact) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const contentHtml = renderToStaticMarkup(
          <div className="markdown-body">
              <h1>{artifact.title}</h1>
              <div style={{ marginBottom: '20px', color: '#666', fontSize: '0.9em' }}>
                  Type: {artifact.type} | Created: {new Date(artifact.created_at).toLocaleString()}
              </div>
              <hr />
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {artifact.content}
              </ReactMarkdown>
          </div>
      );

      printWindow.document.write(`
          <html>
              <head>
                  <title>${artifact.title}</title>
                  <style>
                      body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #334155; line-height: 1.6; max-width: 800px; margin: 0 auto; }
                      h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                      hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
                      .markdown-body p { margin-bottom: 1em; }
                      .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 1em; }
                      .markdown-body code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
                      .markdown-body pre { background: #1e293b; color: #f8fafc; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
                      .markdown-body pre code { background: transparent; padding: 0; color: inherit; }
                      .markdown-body blockquote { border-left: 4px solid #cbd5e1; padding-left: 1em; color: #64748b; margin: 1em 0; }
                      table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                      th { background-color: #f8fafc; font-weight: 600; }
                  </style>
              </head>
              <body>
                  ${contentHtml}
                  <script>
                      window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
                  </script>
              </body>
          </html>
      `);
      printWindow.document.close();
  };

  const renderArtifactIcon = (type: string) => {
      switch(type) {
          case 'blueprint_json': return <Code size={16} className="text-indigo-500" />;
          case 'sql_schema': return <Database size={16} className="text-amber-500" />;
          case 'api_spec': return <Server size={16} className="text-emerald-500" />;
          default: return <FileText size={16} className="text-zinc-500" />;
      }
  };

  if (isLoading && !session) {
      return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!session) return <div className="p-8 text-center text-zinc-500">{t('ailab.detail.sessionNotFound')}</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <button onClick={() => router.push('/apps/ai-lab')} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                      {session.title}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          session.status === 'active' ? 'bg-indigo-100 text-indigo-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                          {session.status}
                      </span>
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 flex items-center gap-2">
                      <Cpu size={14} /> {t('ailab.form.sessionMode')}: {session.mode}
                  </p>
              </div>
          </div>
      </div>

      {/* Main Content: Split View (Chat + Artifacts) */}
      <div className="flex-1 flex gap-6 overflow-hidden">
          
          {/* Left: Chat Stream */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Clock size={16} className="text-zinc-400" />
                  {t('ailab.detail.thinkingStream')}
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.map((msg) => (
                      <div key={msg.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg border-2 shadow-sm ${
                              msg.agent_role === 'System' ? 'bg-zinc-100 border-zinc-200' : 
                              msg.agent_role.includes('Architect') ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'
                          }`}>
                              {msg.agent_role === 'System' ? '🤖' : '🧑‍🔬'}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-zinc-900 dark:text-white text-sm">{msg.agent_name}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{msg.agent_role}</span>
                                  <span className="text-xs text-zinc-400 ml-auto">{new Date(msg.created_at).toLocaleTimeString()}</span>
                              </div>
                              
                              {/* Internal Thought (System 2) */}
                              {msg.content.thought && (
                                  <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 font-mono italic">
                                      <div className="flex items-center gap-1.5 mb-1 text-zinc-400 not-italic font-bold uppercase tracking-wider text-[10px]">
                                          <Cpu size={10} /> {t('ailab.detail.internalMonologue')}
                                      </div>
                                      {msg.content.thought}
                                  </div>
                              )}

                              {/* Public Speech */}
                              <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {msg.content.speech}
                                  </ReactMarkdown>
                              </div>
                          </div>
                      </div>
                  ))}
                  {session.status === 'active' && (
                      <div className="flex items-center gap-3 text-zinc-400 text-sm animate-pulse pl-14">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200" />
                          {t('ailab.detail.thinking')}
                      </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>
          </div>

          {/* Right: Artifacts (Blueprints) */}
          <div className="w-[30rem] bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-sm shrink-0">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <FileText size={16} className="text-zinc-400" />
                  {t('ailab.detail.artifacts')}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-950/30">
                  {artifacts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                          <Cpu size={32} className="mb-3 opacity-20" />
                          <p>{t('ailab.detail.artifactsEmpty')}</p>
                      </div>
                  ) : (
                      artifacts.map(artifact => (
                          <div key={artifact.id} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                              <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                      {renderArtifactIcon(artifact.type)}
                                      <span className="font-bold text-sm text-zinc-900 dark:text-white truncate max-w-[200px]">{artifact.title}</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => copyToClipboard(artifact.content)} className="text-zinc-400 hover:text-indigo-600 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title={t('ailab.detail.copyContent')}>
                                          <Copy size={14} />
                                      </button>
                                  </div>
                              </div>
                              <div className="relative group/code">
                                  <div id={`artifact-content-${artifact.id}`} className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg mb-3 border border-zinc-100 dark:border-zinc-700 max-h-[400px] overflow-y-auto custom-scrollbar prose prose-sm dark:prose-invert max-w-none">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                          {artifact.content}
                                      </ReactMarkdown>
                                  </div>
                              </div>
                              <div className="flex justify-end pt-2 border-t border-zinc-50 dark:border-zinc-800 gap-2">
                                  <button
                                    onClick={() => handleArtifactScreenshot(artifact.id)}
                                    className="text-xs flex items-center gap-1.5 text-zinc-500 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                                    title={t('ailab.detail.screenshotToClipboard')}
                                  >
                                      <Camera size={14} />
                                      {t('ailab.detail.screenshot')}
                                  </button>
                                  <button
                                    onClick={() => handleArtifactPDF(artifact)}
                                    className="text-xs flex items-center gap-1.5 text-zinc-500 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                                    title={t('ailab.detail.exportPdf')}
                                  >
                                      <Download size={14} />
                                      PDF
                                  </button>
                                  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 my-auto"></div>
                                  <button 
                                    onClick={() => copyToClipboard(artifact.content)}
                                    className="text-xs flex items-center gap-1.5 text-indigo-600 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                      <Copy size={14} />
                                      {t('ailab.detail.copyAll')}
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}

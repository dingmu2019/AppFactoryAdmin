import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, Copy, Download, Code, Cpu, Database, Server } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '../../../../contexts';
import { supabase } from '../../../../lib/supabase';

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [session, setSession] = useState<LabSession | null>(null);
  const [messages, setMessages] = useState<LabMessage[]>([]);
  const [artifacts, setArtifacts] = useState<LabArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchDetails = async () => {
    try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) return;

        const response = await fetch(`/api/ai/lab/sessions/${id}`, {
            headers: { 'Authorization': `Bearer ${authSession.access_token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load session');
        
        const data = await response.json();
        setSession(data.session);
        setMessages(data.messages);
        setArtifacts(data.artifacts);
    } catch (error) {
        console.error(error);
        showToast('加载失败', 'error');
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
    showToast('已复制', 'success');
  };

  const renderArtifactIcon = (type: string) => {
      switch(type) {
          case 'blueprint_json': return <Code size={16} className="text-indigo-500" />;
          case 'sql_schema': return <Database size={16} className="text-amber-500" />;
          case 'api_spec': return <Server size={16} className="text-emerald-500" />;
          default: return <FileText size={16} className="text-slate-500" />;
      }
  };

  if (isLoading && !session) {
      return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!session) return <div className="p-8 text-center text-slate-500">会话不存在</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <button onClick={() => navigate('/ai-lab')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      {session.title}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          session.status === 'active' ? 'bg-indigo-100 text-indigo-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                          {session.status}
                      </span>
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-2">
                      <Cpu size={14} /> Mode: {session.mode}
                  </p>
              </div>
          </div>
      </div>

      {/* Main Content: Split View (Chat + Artifacts) */}
      <div className="flex-1 flex gap-6 overflow-hidden">
          
          {/* Left: Chat Stream */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  实验过程 (Thinking Stream)
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.map((msg) => (
                      <div key={msg.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg border-2 shadow-sm ${
                              msg.agent_role === 'System' ? 'bg-slate-100 border-slate-200' : 
                              msg.agent_role.includes('Architect') ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'
                          }`}>
                              {msg.agent_role === 'System' ? '🤖' : '🧑‍🔬'}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">{msg.agent_name}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{msg.agent_role}</span>
                                  <span className="text-xs text-slate-400 ml-auto">{new Date(msg.created_at).toLocaleTimeString()}</span>
                              </div>
                              
                              {/* Internal Thought (System 2) */}
                              {msg.content.thought && (
                                  <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono italic">
                                      <div className="flex items-center gap-1.5 mb-1 text-slate-400 not-italic font-bold uppercase tracking-wider text-[10px]">
                                          <Cpu size={10} /> Internal Monologue
                                      </div>
                                      {msg.content.thought}
                                  </div>
                              )}

                              {/* Public Speech */}
                              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {msg.content.speech}
                                  </ReactMarkdown>
                              </div>
                          </div>
                      </div>
                  ))}
                  {session.status === 'active' && (
                      <div className="flex items-center gap-3 text-slate-400 text-sm animate-pulse pl-14">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200" />
                          AI is thinking...
                      </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>
          </div>

          {/* Right: Artifacts (Blueprints) */}
          <div className="w-[30rem] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm shrink-0">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  生成工件 (Artifacts)
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
                  {artifacts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                          <Cpu size={32} className="mb-3 opacity-20" />
                          <p>实验完成后将在此处生成 AlphaCode 蓝图或报告。</p>
                      </div>
                  ) : (
                      artifacts.map(artifact => (
                          <div key={artifact.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                              <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                      {renderArtifactIcon(artifact.type)}
                                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[200px]">{artifact.title}</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => copyToClipboard(artifact.content)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="复制内容">
                                          <Copy size={14} />
                                      </button>
                                  </div>
                              </div>
                              <div className="relative group/code">
                                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg font-mono mb-3 border border-slate-100 dark:border-slate-700 max-h-[400px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                      {artifact.content}
                                  </div>
                              </div>
                              <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
                                  <button 
                                    onClick={() => copyToClipboard(artifact.content)}
                                    className="text-xs flex items-center gap-1.5 text-indigo-600 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                      <Download size={14} />
                                      导出 / 复制全文
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

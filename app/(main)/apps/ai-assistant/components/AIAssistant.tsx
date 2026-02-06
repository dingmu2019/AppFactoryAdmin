import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Eraser, ThumbsUp, ThumbsDown, Copy, Download, Zap, Paperclip, Maximize2, Minimize2, Info, Camera, FileText, MoreHorizontal, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { useToast } from '../../../../../contexts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { callLLM, ChatMessage } from '../../../../../lib/ai/client';
import CodeBlock from './markdown/CodeBlock';
import MermaidDiagram from './markdown/MermaidDiagram';
import { ConfirmModal } from '@/components/ConfirmModal';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  system_prompt: string;
}

interface Prompt {
  id: string;
  label: string;
  content: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  feedback?: 'like' | 'dislike';
  is_deleted?: boolean;
}

export const AIAssistant: React.FC = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentsLoading, setIsAgentsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Fetch Active Agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setAgents(data || []);
        if (data && data.length > 0) {
          setActiveAgent(data[0]);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setIsAgentsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  // Fetch Data when Agent changes
  useEffect(() => {
    if (!activeAgent) return;
    
    const fetchData = async () => {
      // 1. Fetch Prompts
      const { data: promptsData } = await supabase
        .from('agent_prompts')
        .select('*')
        .eq('agent_id', activeAgent.id);
      setPrompts(promptsData || []);

      // 2. Fetch History
      // Requirement: Load last 20 messages initially
      const { data: historyData } = await supabase
        .from('ai_chat_messages')
        .select(`
            *,
            users ( email, raw_user_meta_data )
        `) // Join users table to get sender info if needed, though we only need role/timestamp mainly
        .eq('agent_id', activeAgent.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }) // Get newest first
        .limit(20);
        
      if (historyData && historyData.length > 0) {
          // Reverse back to chronological order for display
          const mappedMessages: Message[] = historyData.reverse().map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at).getTime(),
              feedback: msg.feedback as 'like' | 'dislike' | undefined
          }));
          setMessages(mappedMessages);
      } else {
          // Welcome message if no history
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `你好！我是**${activeAgent.name}**，${activeAgent.role}。\n\n${activeAgent.description || '我能为你做什么？'}`,
            timestamp: Date.now()
        }]);
      }
    };
    fetchData();
  }, [activeAgent]);

  // Handle Scroll for Load More (Simple Implementation)
  // Note: For a robust implementation, we would need a proper infinite scroll handler
  // For MVP, we stick to initial load.
  // Requirement: "历史回话内容加载最近的20条，向上滚动时可显示更多历史回话"
  // Let's add a "Load More" button or logic.
  
  const handleLoadMore = async () => {
      if (!activeAgent || messages.length === 0) return;
      
      const oldestMsg = messages[0];
      if (oldestMsg.id === 'welcome') return; // Don't load before welcome

      // We need the timestamp of the oldest message to paginate
      // Or just offset. Using created_at < oldestMsg.created_at is safer.
      // Since we store timestamp in state, let's use it.
      
      const oldestDate = new Date(oldestMsg.timestamp).toISOString();

      const { data: moreData } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('agent_id', activeAgent.id)
        .eq('is_deleted', false)
        .lt('created_at', oldestDate)
        .order('created_at', { ascending: false })
        .limit(20);

      if (moreData && moreData.length > 0) {
          const mappedMore: Message[] = moreData.reverse().map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at).getTime(),
              feedback: msg.feedback as 'like' | 'dislike' | undefined
          }));
          
          setMessages(prev => [...mappedMore, ...prev]);
      } else {
          showToast('没有更多历史记录了', 'info');
      }
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveMessageToDB = async (role: 'user' | 'assistant', content: string, replyTo?: string) => {
      if (!activeAgent) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
            agent_id: activeAgent.id,
            user_id: user.id,
            role,
            content,
            reply_to: replyTo
        })
        .select()
        .single();
        
      if (error) {
          console.error('Failed to save message:', error);
          return null;
      }
      return data;
  };

  const handleSend = async () => {
    if (!input.trim() || !activeAgent) return;

    const content = input;
    setInput('');
    setIsLoading(true);

    // 1. Optimistic update user message
    const tempUserMsgId = Date.now().toString();
    const userMsg: Message = {
      id: tempUserMsgId,
      role: 'user',
      content: content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 2. Save user message to DB
      const savedUserMsg = await saveMessageToDB('user', content);
      if (savedUserMsg) {
          setMessages(prev => prev.map(m => m.id === tempUserMsgId ? { ...m, id: savedUserMsg.id } : m));
      }

      // 3. Call Real LLM
      
      // Build message history for context
      // Limit context to last 10 messages to save tokens
      const historyContext: ChatMessage[] = messages.slice(-10).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
      }));
      // Add current user message
      historyContext.push({ role: 'user', content: content });

      let aiContent = '';
      try {
          // Dynamic Context Injection
          const dynamicSystemPrompt = `
${activeAgent.system_prompt}

## Dynamic Context
- Time: ${new Date().toLocaleString()}
- Module: AI Assistant (Chat)

## Global Standards
- Use Markdown for formatting (headers, lists, code blocks).
- Be concise, professional, and helpful.
- For code, always specify the language.
- For diagrams, use Mermaid syntax.
          `;

          aiContent = await callLLM(historyContext, dynamicSystemPrompt);
      } catch (err: any) {
          console.error('LLM Call Error:', err);
          aiContent = `⚠️ **调用失败**: ${err.message}\n\n请检查 "系统管理 > 集成配置" 中的 API Key 是否正确配置，或确保当前网络能访问 LLM 服务商接口。`;
      }

      // 4. Save AI message to DB (linked to user message)
      const savedAiMsg = await saveMessageToDB('assistant', aiContent, savedUserMsg?.id);
      
      const aiResponse: Message = {
        id: savedAiMsg?.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error(error);
      showToast('发送失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!activeAgent) return;
    
    setConfirmModal({
      isOpen: true,
      title: '清空对话',
      message: '确定要清空当前对话记录吗？此操作不可恢复。',
      onConfirm: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('ai_chat_messages')
                    .update({ is_deleted: true })
                    .eq('agent_id', activeAgent.id)
                    .eq('user_id', user.id);
            }
            
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `你好！我是**${activeAgent.name}**，${activeAgent.role}。\n\n${activeAgent.description || '我能为你做什么？'}`,
                timestamp: Date.now()
            }]);
            showToast('对话已清空', 'success');
        } catch (error) {
            console.error(error);
            showToast('清空失败', 'error');
        }
      }
    });
  };

  // Actions
  const handleCopy = (content: string) => {
      navigator.clipboard.writeText(content);
      showToast('内容已复制', 'success');
  };

  const handleFeedback = async (msgId: string, type: 'like' | 'dislike') => {
      try {
          await supabase
            .from('ai_chat_messages')
            .update({ feedback: type })
            .eq('id', msgId);
            
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));
          showToast(type === 'like' ? '已点赞' : '已反馈不认同', 'success');
      } catch (error) {
          showToast('操作失败', 'error');
      }
  };

  const handleScreenshot = async (elementId: string) => {
      // 1. Get the container element (message bubble)
      const element = document.getElementById(elementId);
      if (!element) return;

      try {
          // 2. Clone the element to manipulate it safely
          const clone = element.cloneNode(true) as HTMLElement;
          
          // 3. Find and remove the toolbar from the clone (the actions bar)
          // We assume the actions bar is the last child or we can select it by class if we added one.
          // In our structure, the toolbar is inside the message bubble div? No, it's sibling in the container.
          // Let's look at structure:
          // div#msg-id (flex container)
          //   -> div (avatar)
          //   -> div (content wrapper)
          //      -> div (bubble) -> Markdown Content
          //      -> div (toolbar) -> Actions
          
          // If we capture `msg-id`, we capture avatar + bubble + toolbar.
          // User asked for "AI回复截图 只需要截取内容". So we should target the bubble only.
          
          // Let's adjust the target. elementId is `msg-${id}` which is the whole row.
          // We want the bubble. Let's find the bubble inside the element.
          // The bubble is the `rounded-2xl` div inside the content wrapper.
          
          const bubble = element.querySelector('.rounded-2xl');
          if (!bubble) {
              showToast('无法找到内容区域', 'error');
              return;
          }

          // Use the bubble as target
          const canvas = await html2canvas(bubble as HTMLElement, {
              backgroundColor: null, // Transparent background
              scale: 2 // Higher resolution
          });

          canvas.toBlob(blob => {
              if (blob) {
                  navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                  showToast('截图已复制到剪贴板', 'success');
              }
          });
      } catch (error) {
          console.error(error);
          showToast('截图失败', 'error');
      }
  };

  const handleExportPDF = (content: string) => {
      const doc = new jsPDF();
      // Split text to fit page
      const splitText = doc.splitTextToSize(content, 180);
      doc.text(splitText, 10, 10);
      doc.save('ai-chat-export.pdf');
      showToast('PDF 已导出', 'success');
  };

  const handleExportWord = (content: string) => {
      // Simple text export for now as full Word export requires complex HTML parsing
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      saveAs(blob, "ai-chat-export.txt");
      showToast('已导出为文本文件 (Word兼容)', 'success');
  };

  const handleSavePrompt = async (content: string) => {
      if (!activeAgent) return;
      // Truncate label
      const label = content.substring(0, 20) + (content.length > 20 ? '...' : '');
      try {
          const { error } = await supabase
            .from('agent_prompts')
            .insert({
                agent_id: activeAgent.id,
                label,
                content
            });
          if (error) throw error;
          
          // Refresh prompts
           const { data } = await supabase
            .from('agent_prompts')
            .select('*')
            .eq('agent_id', activeAgent.id);
            if (data) setPrompts(data);
            
          showToast('已保存为常用提示词', 'success');
      } catch (error) {
          showToast('保存失败', 'error');
      }
  };

  const handleDeleteMessage = (msgId: string) => {
      setConfirmModal({
          isOpen: true,
          title: '删除消息',
          message: '确定删除此消息吗？',
          onConfirm: async () => {
              try {
                  // 1. Soft delete the message itself
                  await supabase
                    .from('ai_chat_messages')
                    .update({ is_deleted: true })
                    .eq('id', msgId);

                  // 2. Soft delete any replies (AI responses) linked to this message
                  const { data: linkedMessages } = await supabase
                     .from('ai_chat_messages')
                     .update({ is_deleted: true })
                     .eq('reply_to', msgId)
                     .select('id');

                  const linkedIds = linkedMessages?.map(m => m.id) || [];
                  
                  setMessages(prev => prev.filter(m => m.id !== msgId && !linkedIds.includes(m.id)));
                  showToast('消息已删除', 'success');
              } catch (error) {
                  showToast('删除失败', 'error');
              }
          }
      });
  };

  if (isAgentsLoading) {
      return (
          <div className="flex items-center justify-center h-[calc(100vh-140px)]">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
      );
  }

  if (agents.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] text-slate-400">
              <Bot size={48} className="mb-4 opacity-50" />
              <p>暂无启用的 AI 助理</p>
              <p className="text-sm mt-2">请先在“系统管理 {'>'} AI Agent 管理”中配置并启用 Agent。</p>
          </div>
      );
  }

  return (
    <div className={`flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 ${isFullScreen ? 'fixed inset-4 z-50 h-auto' : 'h-[calc(100vh-140px)]'}`}>
      {/* Sidebar - Agent Selection */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">选择助理</h3>
            <p className="text-xs text-slate-500">Switch Assistant</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {agents.map(agent => (
                <button
                    key={agent.id}
                    onClick={() => setActiveAgent(agent)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                        activeAgent?.id === agent.id 
                        ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-indigo-500/20' 
                        : 'hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg shadow-sm">
                        {agent.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate text-slate-900 dark:text-white">{agent.name}</div>
                        <div className="text-xs text-slate-500 truncate">{agent.role}</div>
                    </div>
                </button>
            ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        {/* Chat Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <div className="text-2xl animate-in zoom-in duration-300">{activeAgent?.avatar}</div>
                <div>
                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {activeAgent?.name}
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium uppercase tracking-wide">AI Agent</span>
                    </h2>
                    <p className="text-xs text-slate-500">{activeAgent?.role}</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button 
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="技能中心"
                >
                    <Zap size={18} />
                </button>
                <button 
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="系统提示词"
                    onClick={() => showToast('System Prompt: ' + activeAgent?.system_prompt.substring(0, 50) + '...', 'info')}
                >
                    <Info size={18} />
                </button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button 
                    onClick={handleClear}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    title="清空对话"
                >
                    <Eraser size={18} />
                </button>
                 <button 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title={isFullScreen ? "退出全屏" : "全屏模式"}
                >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 dark:bg-slate-950/50">
            {messages.length > 0 && messages[0].id !== 'welcome' && (
                <div className="flex justify-center">
                    <button 
                        onClick={handleLoadMore}
                        className="text-xs text-slate-400 hover:text-indigo-600 transition-colors py-2"
                    >
                        加载更多历史记录
                    </button>
                </div>
            )}
            {messages.map((msg) => (
                <div key={msg.id} id={`msg-${msg.id}`} className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-2xl'
                    }`}>
                        {msg.role === 'user' ? <User size={18} /> : activeAgent?.avatar}
                    </div>
                    
                    <div className={`max-w-[85%] space-y-2`}>
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {msg.role === 'user' ? 'Me' : activeAgent?.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        <div className={`rounded-2xl p-5 shadow-sm relative ${
                            msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                        }`}>
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({node, inline, className, children, ...props}: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isMermaid = match && match[1] === 'mermaid';
                                            
                                            if (!inline && isMermaid) {
                                                return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                                            }

                                            return !inline && match ? (
                                                <CodeBlock
                                                    language={match[1]}
                                                    value={String(children).replace(/\n$/, '')}
                                                />
                                            ) : (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>

                            {/* User Message Actions Menu (Hover) */}
                            {msg.role === 'user' && (
                                <div className="absolute top-2 left-0 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 pr-2">
                                     <button onClick={() => handleCopy(msg.content)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 shadow-sm" title="复制">
                                        <Copy size={14} />
                                    </button>
                                     <button onClick={() => handleSavePrompt(msg.content)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-emerald-600 shadow-sm" title="存为常用提示词">
                                        <Save size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-rose-600 shadow-sm" title="删除">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* AI Message Actions */}
                        {msg.role === 'assistant' && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                                <button onClick={() => handleCopy(msg.content)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="复制">
                                    <Copy size={14} />
                                </button>
                                <button 
                                    onClick={() => handleFeedback(msg.id, 'like')}
                                    className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors ${msg.feedback === 'like' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`} 
                                    title="点赞"
                                >
                                    <ThumbsUp size={14} />
                                </button>
                                <button 
                                    onClick={() => handleFeedback(msg.id, 'dislike')}
                                    className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors ${msg.feedback === 'dislike' ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'}`} 
                                    title="不认同"
                                >
                                    <ThumbsDown size={14} />
                                </button>
                                <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-1" />
                                <button onClick={() => handleScreenshot(`msg-${msg.id}`)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="截图">
                                    <Camera size={14} />
                                </button>
                                <button onClick={() => handleExportPDF(msg.content)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="导出PDF">
                                    <FileText size={14} />
                                </button>
                                <button onClick={() => handleExportWord(msg.content)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="导出Word">
                                    <Download size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl shadow-sm">
                        {activeAgent?.avatar}
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm p-5 shadow-sm flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">AI is thinking</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            {/* Quick Prompts */}
            {prompts.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {prompts.map(prompt => (
                        <button
                            key={prompt.id}
                            onClick={() => setInput(prompt.content)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full whitespace-nowrap hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800/50"
                        >
                            <Sparkles size={12} />
                            {prompt.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="relative group">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder={`给 ${activeAgent?.name || 'AI'} 发送消息... (输入 @ 唤起技能)`}
                    rows={1}
                    className="w-full pl-4 pr-24 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none max-h-32 min-h-[52px] shadow-inner transition-all"
                    style={{ height: 'auto', minHeight: '52px' }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="上传文件"
                    >
                        <Paperclip size={18} />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20"
                    >
                        <Send size={18} />
                    </button>
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
};

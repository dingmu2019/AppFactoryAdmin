import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { ComponentType } from 'react';
import { Send, Bot, User, Sparkles, Eraser, ThumbsUp, ThumbsDown, Copy, Download, Zap, Paperclip, Maximize2, Minimize2, Info, Camera, FileText, Save, Trash2, X, File as FileIcon, Loader2, Wand2 } from 'lucide-react';
import { Tooltip } from '../../../../components/Tooltip';
import { AgentAvatar } from '../../../../components/AgentAvatar';
import { ConfirmModal } from '../../../../components/ConfirmModal';
import { supabase } from '../../../../lib/supabase';
import { useToast, useI18n, usePageHeader } from '../../../../contexts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { callLLM } from '../../../../lib/ai/client';
import type { ChatMessage } from '../../../../lib/ai/client';
import CodeBlock from './markdown/CodeBlock';
import MermaidDiagram from './markdown/MermaidDiagram';
import { SkillsCenterModal } from './SkillsCenterModal';
import { SystemPromptModal } from './SystemPromptModal';

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
  attachments?: { type: string; url: string; name: string }[];
}

interface Attachment {
  id: string;
  file: File;
  preview?: string; // base64 for images
  type: 'image' | 'text' | 'file';
  content?: string; // text content
}

export const AIAssistant: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader('AI 对话', '智能助手 / 实时问答');
  }, [setPageHeader]);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentsLoading, setIsAgentsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isSystemPromptModalOpen, setIsSystemPromptModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Add a ref to track if we are initializing a new agent session
  const isAgentChanging = useRef(false);
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  
  const Markdown = ReactMarkdown as unknown as ComponentType<any>;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Auto-resize textarea with flicker prevention
  useLayoutEffect(() => {
    const target = inputRef.current;
    if (target) {
        target.style.height = 'auto';
        const newHeight = Math.min(target.scrollHeight, 192); // Max 48rem * 4 rows approx
        target.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const newAttachments: Attachment[] = [];

        for (const file of files) {
            // Check size (e.g. 10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                showToast(`File ${file.name} exceeds 10MB limit`, 'error');
                continue;
            }

            const isImage = file.type.startsWith('image/');
            const isText = file.type.startsWith('text/') || 
                           file.name.endsWith('.md') || 
                           file.name.endsWith('.json') || 
                           file.name.endsWith('.ts') || 
                           file.name.endsWith('.tsx') || 
                           file.name.endsWith('.js') ||
                           file.name.endsWith('.sql') ||
                           file.name.endsWith('.csv');
            
            let preview = '';
            let content = '';

            if (isImage) {
                preview = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            } else if (isText) {
                try {
                    content = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsText(file);
                    });
                } catch (e) {
                    console.warn('Failed to read text file', e);
                }
            }

            newAttachments.push({
                id: Math.random().toString(36).substr(2, 9),
                file,
                preview,
                content,
                type: isImage ? 'image' : isText ? 'text' : 'file'
            });
        }
        
        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleOptimize = async () => {
      if (!input.trim() || isOptimizing) return;
      
      setIsOptimizing(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/chat/optimize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ content: input })
        });
        
        const data = await res.json();
        if (data.content) {
            setInput(data.content);
            showToast(t('common.success'), 'success');
        }
      } catch (err) {
          console.error(err);
          showToast(t('common.error'), 'error');
      } finally {
          setIsOptimizing(false);
      }
  };
 
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
    
    // Clear messages when switching agents to prevent mixing or jumping
    setMessages([]); 
    isAgentChanging.current = true;

    const fetchData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Prompts
      const { data: promptsData } = await supabase
        .from('agent_prompts')
        .select('*')
        .eq('agent_id', activeAgent.id);
      setPrompts(promptsData || []);

      // 2. Fetch History
      // Requirement: Load last 20 messages initially
      const { data: historyData, error: historyError } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('agent_id', activeAgent.id)
        .eq('user_id', user.id) // Filter by user_id
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }) // Get newest first
        .limit(20);
      
      if (historyError) {
          console.error('Failed to load chat history:', historyError);
      }
        
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
            content: `Hi! I am **${activeAgent.name}**, ${activeAgent.role}.\n\n${activeAgent.description || 'How can I help you?'}`,
            timestamp: Date.now()
        }]);
      }
    };
    fetchData();
  }, [activeAgent]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null); // New ref for inner content
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  // Scroll State Tracking
  const isAtBottomRef = useRef(true); // Default to true
  const prevScrollHeightRef = useRef(0);
  // isAgentChanging is already declared at top level, reuse it

  // 1. Track Scroll Position
  const handleScroll = async () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Update "At Bottom" status (Tolerance 50px)
      // We only update this if we are NOT loading history to avoid false negatives during load
      if (!isHistoryLoading) {
          isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
      }

      // Check for History Load (Scroll to Top)
      if (scrollTop === 0 && !isHistoryLoading && messages.length > 0 && messages[0].id !== 'welcome') {
          prevScrollHeightRef.current = scrollHeight;
          setIsHistoryLoading(true);
          await handleLoadMore();
      }
  };

  // 2. Handle Resize (Dynamic Content / Diagrams expanding)
  useEffect(() => {
      const content = messagesContentRef.current;
      if (!content) return;

      const observer = new ResizeObserver(() => {
          // If we were at the bottom, stay at the bottom when content grows
          if (isAtBottomRef.current && messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
      });

      observer.observe(content);
      return () => observer.disconnect();
  }, []);

  // 3. Handle Messages Update (History Load & New Messages)
  useLayoutEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      // Scenario A: History Loaded (Restore Position)
      if (prevScrollHeightRef.current > 0) {
          const newScrollHeight = container.scrollHeight;
          const diff = newScrollHeight - prevScrollHeightRef.current;
          
          if (diff > 0) {
              container.scrollTop = diff;
          }
          
          prevScrollHeightRef.current = 0;
          setIsHistoryLoading(false);
          return;
      }

      // Scenario B: Agent Changed (Scroll to Bottom)
      if (isAgentChanging.current) {
          container.scrollTop = container.scrollHeight;
          // Reset flag after a delay to allow animations
          setTimeout(() => { isAgentChanging.current = false; }, 100);
          isAtBottomRef.current = true;
          return;
      }

      // Scenario C: New Message (Auto-Scroll if at bottom)
      if (isAtBottomRef.current) {
          container.scrollTop = container.scrollHeight;
      }
  }, [messages]);

  const handleLoadMore = async () => {
      if (!activeAgent || messages.length === 0) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const oldestMsg = messages[0];
      if (oldestMsg.id === 'welcome') return; 

      const oldestDate = new Date(oldestMsg.timestamp).toISOString();

      const { data: moreData, error: moreError } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('agent_id', activeAgent.id)
        .eq('user_id', user.id) // Filter by user_id
        .eq('is_deleted', false)
        .lt('created_at', oldestDate)
        .order('created_at', { ascending: false })
        .limit(10); // Load 10 more

      if (moreError) {
          console.error('Failed to load more messages:', moreError);
          setIsHistoryLoading(false); // Reset loading state on error
          return;
      }

      if (moreData && moreData.length > 0) {
          const mappedMore: Message[] = moreData.reverse().map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at).getTime(),
              feedback: msg.feedback as 'like' | 'dislike' | undefined,
              attachments: msg.attachments || [] // Add attachments if any
          }));
          
          setMessages(prev => [...mappedMore, ...prev]);
      } else {
          // No more messages
          setIsHistoryLoading(false);
      }
  };

  // Auto scroll to bottom
  // NOTE: This useEffect is no longer needed as useLayoutEffect handles scroll logic

  const saveMessageToDB = async (role: 'user' | 'assistant', content: string, replyTo?: string, msgAttachments?: any[]) => {
      if (!activeAgent) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const payload: any = {
        agent_id: activeAgent.id,
        user_id: user.id,
        role,
        content,
        attachments: msgAttachments || []
      };

      // Only include reply_to if it's defined and not empty
      if (replyTo) {
        payload.reply_to = replyTo;
      }

      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert(payload)
        .select()
        .single();
        
      if (error) {
          // If error is about missing column 'reply_to', retry without it (backward compatibility)
          if (error.code === 'PGRST204' && error.message.includes('reply_to')) {
             console.warn('Column reply_to missing, retrying without it...');
             delete payload.reply_to;
             const { data: retryData, error: retryError } = await supabase
                .from('ai_chat_messages')
                .insert(payload)
                .select()
                .single();
             
             if (retryError) {
                 console.error('Failed to save message (retry):', retryError);
                 return null;
             }
             return retryData;
          }

          console.error('Failed to save message:', error);
          return null;
      }
      return data;
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || !activeAgent) return;

    const content = input;
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]); // Clear UI immediately
    setIsLoading(true);

    // 0. Upload attachments to Storage
    const uploadedAttachments: { type: string; url: string; name: string }[] = [];
    const llmContentParts: any[] = [];

    // Add text content first if exists
    if (content) {
        llmContentParts.push({ type: 'text', text: content });
    }

    if (currentAttachments.length > 0) {
        showToast(`正在上传 ${currentAttachments.length} 个附件...`, 'info');
        
        for (const att of currentAttachments) {
            try {
                // Upload to Supabase Storage
                const fileExt = att.file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `${activeAgent.id}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('chat-attachments')
                    .upload(filePath, att.file);
                
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('chat-attachments')
                    .getPublicUrl(filePath);

                uploadedAttachments.push({
                    type: att.type,
                    url: publicUrl,
                    name: att.file.name
                });

                // Prepare for LLM
                if (att.type === 'image') {
                    // For LLM, we pass the data URI if we have preview (faster/better for some models) 
                    // OR the public URL. 
                    // Let's use the public URL for consistency, but GeminiProvider logic handles http url now.
                    // Wait, GeminiProvider logic I added puts it as text "[Image: url]" for http urls unless I change it.
                    // Actually, OpenAI supports URL.
                    // Gemini supports inlineData (base64).
                    // My previous GeminiProvider change:
                    // } else if (url.startsWith('http')) { parts.push({ text: `[Image: ${url}]` }); }
                    // This means Gemini WON'T see the image content if I send URL.
                    // So for Gemini, I should send the base64 preview I already have!
                    
                    llmContentParts.push({
                        type: 'image_url',
                        image_url: {
                            url: att.preview || publicUrl // Prefer base64 preview for Gemini compatibility
                        }
                    });
                } else if (att.type === 'text' && att.content) {
                    // Append text file content
                    llmContentParts.push({
                        type: 'text',
                        text: `\n\n--- File: ${att.file.name} ---\n${att.content}\n--- End of File ---\n`
                    });
                } else {
                    // Other files: Just mention them
                    llmContentParts.push({
                        type: 'text',
                        text: `\n[User uploaded file: ${att.file.name} (${publicUrl})]`
                    });
                }

            } catch (err) {
                console.error('Upload failed', err);
                showToast(`File ${att.file.name} upload failed`, 'error');
            }
        }
    }

    // 1. Optimistic update user message
    const tempUserMsgId = Date.now().toString();
    const userMsg: Message = {
      id: tempUserMsgId,
      role: 'user',
      content: content,
      timestamp: Date.now(),
      attachments: uploadedAttachments
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 2. Save user message to DB
      // We store the RAW content string in DB 'content' column for backward compatibility/search
      // But we store attachments in 'attachments' column.
      const savedUserMsg = await saveMessageToDB('user', content, undefined, uploadedAttachments);
      if (savedUserMsg) {
          setMessages(prev => prev.map(m => m.id === tempUserMsgId ? { ...m, id: savedUserMsg.id } : m));
      }

      // 3. Call Real LLM
      
      // Fix history context to include attachments if available in state
      const detailedHistoryContext: ChatMessage[] = messages.slice(-10).map(m => {
          if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
             // Reconstruct multimodal message
             const parts: any[] = [{ type: 'text', text: m.content }];
             m.attachments.forEach(att => {
                 if (att.type === 'image') { // Check if 'type' exists on attachment
                     parts.push({ type: 'image_url', image_url: { url: att.url } });
                 } else {
                     parts.push({ type: 'text', text: `[Attachment: ${att.name}]` });
                 }
             });
             return { role: 'user', content: parts };
          }
          return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
      });

      // Add current message
      detailedHistoryContext.push({ role: 'user', content: llmContentParts });

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

          aiContent = await callLLM(detailedHistoryContext, dynamicSystemPrompt, activeAgent.id);
      } catch (err: any) {
          console.error('LLM Call Error:', err);
          aiContent = `⚠️ **Error**: ${err.message}\n\nPlease check your API Key configuration in System > Integration, or ensure network connectivity.`;
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
      // Restore attachments
      setAttachments(currentAttachments);
      setInput(content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!activeAgent) return;
    
    setConfirmModal({
        isOpen: true,
        title: t('common.ai.assistant.clear'),
        message: t('common.ai.assistant.confirmClear'),
        onConfirm: async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const res = await fetch(`${baseUrl}/api/ai/chat/history?agentId=${encodeURIComponent(activeAgent.id)}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to clear');
                }
                
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hi! I am **${activeAgent.name}**, ${activeAgent.role}.\n\n${activeAgent.description || 'How can I help you?'}`,
                    timestamp: Date.now()
                }]);
                showToast(t('common.success'), 'success');
            } catch (error) {
                console.error(error);
                showToast(t('common.error'), 'error');
            }
        }
    });
  };

  // Actions
  const handleCopy = (content: string) => {
      navigator.clipboard.writeText(content);
      showToast(t('common.ai.assistant.copySuccess'), 'success');
  };

  const handleFeedback = async (msgId: string, type: 'like' | 'dislike') => {
      try {
          await supabase
            .from('ai_chat_messages')
            .update({ feedback: type })
            .eq('id', msgId);
            
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));
          showToast(type === 'like' ? t('common.ai.assistant.like') : t('common.ai.assistant.dislike'), 'success');
      } catch (error) {
          showToast(t('common.error'), 'error');
      }
  };

  const normalizeCssColor = (() => {
      let ctx: CanvasRenderingContext2D | null = null;
      return (color: string) => {
          const trimmed = (color || '').trim();
          if (!trimmed) return trimmed;
          if (!ctx) {
              const canvas = document.createElement('canvas');
              canvas.width = 1;
              canvas.height = 1;
              ctx = canvas.getContext('2d');
          }
          if (!ctx) return trimmed;
          try {
              ctx.fillStyle = '#000000';
              ctx.fillStyle = trimmed;
              return String(ctx.fillStyle);
          } catch {
              return trimmed;
          }
      };
  })();

  const replaceOklchInCss = (value: string) => {
      const raw = (value || '').trim();
      if (!raw || !raw.includes('oklch')) return raw;
      return raw.replace(/oklch\([^)]*\)/g, (m) => normalizeCssColor(m));
  };

  const sanitizeOklchStyles = (root: Element, doc: Document) => {
      const view = doc.defaultView || window;
      const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
      const props = [
          'color',
          'background-color',
          'border-top-color',
          'border-right-color',
          'border-bottom-color',
          'border-left-color',
          'outline-color',
          'text-decoration-color',
          'column-rule-color',
          'caret-color',
          'fill',
          'stroke',
          'stop-color',
          'flood-color',
          'lighting-color',
          'background-image',
          'box-shadow',
          'text-shadow',
      ];

      for (const el of nodes) {
          const style = view.getComputedStyle(el);
          if (!style) continue;

          for (const prop of props) {
              const val = style.getPropertyValue(prop);
              if (!val || !val.includes('oklch')) continue;

              let nextVal = replaceOklchInCss(val);
              if (prop === 'background-image' && nextVal.includes('oklch')) {
                  nextVal = 'none';
              }
              (el as HTMLElement).style.setProperty(prop, nextVal);
          }
      }
  };

  const downloadPng = (dataUrl: string, filename: string) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
  };

  const handleScreenshot = async (elementId: string) => {
      const msgId = elementId.replace('msg-', '');
      const element = document.getElementById(elementId);
      if (!element) return;

      try {
          setIsCapturing(msgId);
          const bubble = element.querySelector('.ai-message-bubble') as HTMLElement;
          if (!bubble) {
              showToast('未找到对话内容', 'error');
              return;
          }

          showToast('正在准备截图...', 'info');

          // 1. Clone the bubble
          const clone = bubble.cloneNode(true) as HTMLElement;
          clone.setAttribute('data-h2c-root', msgId);
          
          // Style the clone
          clone.style.position = 'fixed';
          clone.style.top = '0';
          clone.style.left = '0';
          clone.style.width = bubble.offsetWidth + 'px';
          clone.style.zIndex = '-9999';
          clone.style.opacity = '1';
          clone.style.visibility = 'visible';
          clone.style.transform = 'none';
          clone.style.transition = 'none';
          clone.style.borderRadius = '12px';
          clone.style.boxSizing = 'border-box';
          clone.style.paddingBottom = '24px';
          
          const isDark = document.documentElement.classList.contains('dark');
          const bubbleStyle = window.getComputedStyle(bubble);
          const bubbleBg = bubbleStyle.backgroundColor && bubbleStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
              ? bubbleStyle.backgroundColor
              : (isDark ? '#0f172a' : '#ffffff');
          clone.style.backgroundColor = bubbleBg;
          clone.style.color = bubbleStyle.color || (isDark ? '#f1f5f9' : '#0f172a');
          
          document.body.appendChild(clone);

          // 2. Handle Mermaid Diagrams specifically
          const originalMermaids = bubble.querySelectorAll('.mermaid-container');
          const clonedMermaids = clone.querySelectorAll('.mermaid-container');

          for (let i = 0; i < originalMermaids.length; i++) {
              const original = originalMermaids[i] as HTMLElement;
              const cloned = clonedMermaids[i] as HTMLElement;
              
              if (original && cloned) {
                  try {
                      const originalStyle = window.getComputedStyle(original);
                      const mermaidBg = originalStyle.backgroundColor && originalStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
                          ? originalStyle.backgroundColor
                          : (isDark ? '#0f172a' : '#ffffff');

                      let dataUrl = '';
                      try {
                          dataUrl = await toPng(original, {
                              cacheBust: true,
                              pixelRatio: 2,
                              backgroundColor: mermaidBg,
                              style: { transform: 'none', transition: 'none' },
                          });
                      } catch {
                          const canvas = await html2canvas(original, {
                              backgroundColor: mermaidBg,
                              scale: 2,
                              useCORS: true,
                              logging: false,
                              onclone: (clonedDoc) => {
                                  sanitizeOklchStyles(clonedDoc.body, clonedDoc);
                              },
                          });
                          dataUrl = canvas.toDataURL('image/png');
                      }

                      cloned.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: auto; display: block; border-radius: 8px;" />`;
                      cloned.style.background = mermaidBg;
                      cloned.style.padding = '0';
                  } catch (e) {
                      console.warn('Failed to capture mermaid with html2canvas', e);
                  }
              }
          }

          await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          const width = Math.ceil(clone.scrollWidth);
          const height = Math.ceil(clone.scrollHeight);

          const dataUrl = await toPng(clone, {
              cacheBust: true,
              pixelRatio: 2,
              backgroundColor: bubbleBg,
              width,
              height,
              canvasWidth: width,
              canvasHeight: height,
              style: {
                  transform: 'none',
                  transition: 'none',
                  borderRadius: '12px',
              },
              filter: (node) => {
                  if (node instanceof HTMLElement) {
                      if (node.tagName === 'BUTTON') return false;
                      if (node.classList.contains('absolute') && node.classList.contains('-bottom-8')) return false;
                  }
                  return true;
              },
          });
          document.body.removeChild(clone);

          try {
              if (!document.hasFocus() || !navigator.clipboard) {
                  downloadPng(dataUrl, `ai-screenshot-${msgId}.png`);
                  showToast('浏览器未聚焦，已改为下载截图', 'success');
                  return;
              }
              const blob = await (await fetch(dataUrl)).blob();
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              showToast('截图已复制到剪贴板', 'success');
          } catch (e: any) {
              downloadPng(dataUrl, `ai-screenshot-${msgId}.png`);
              showToast('复制失败，已改为下载截图', 'success');
          }
      } catch (error) {
          console.error('Screenshot failed:', error);
          showToast('截图生成失败', 'error');
      } finally {
          setIsCapturing(null);
      }
  };

  const handleExportPDF = async (msgId: string) => {
      const element = document.getElementById(`msg-${msgId}`);
      if (!element) return;
      const markdownBody = element.querySelector('.markdown-body');
      if (!markdownBody) return;

      setIsExportingPDF(msgId);
      showToast('正在生成 PDF...', 'info');

      try {
          // Clone and prepare content
          const clone = markdownBody.cloneNode(true) as HTMLElement;
          
          // Handle Mermaid in PDF too
          const originalMermaids = markdownBody.querySelectorAll('.mermaid-container');
          const clonedMermaids = clone.querySelectorAll('.mermaid-container');

          for (let i = 0; i < originalMermaids.length; i++) {
              const original = originalMermaids[i] as HTMLElement;
              const cloned = clonedMermaids[i] as HTMLElement;
              if (original && cloned) {
                  const canvas = await html2canvas(original, { 
                      scale: 2,
                      onclone: (clonedDoc) => {
                          sanitizeOklchStyles(clonedDoc.body, clonedDoc);
                      }
                  });
                  cloned.innerHTML = `<img src="${canvas.toDataURL('image/png')}" style="width: 100%; max-width: 600px; height: auto; margin: 10px 0;" />`;
              }
          }

          const contentHtml = clone.innerHTML;
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
              showToast('请允许弹出窗口', 'error');
              return;
          }

          printWindow.document.write(`
            <html>
              <head>
                <title>AI 对话导出 - ${new Date().toLocaleDateString()}</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 850px; margin: 0 auto; color: #334155; }
                  @media print { @page { margin: 15mm; size: A4; } body { padding: 0; } }
                  h1, h2, h3 { color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; }
                  h1 { font-size: 2.25em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
                  p { line-height: 1.7; margin-bottom: 1.2em; }
                  code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; color: #4f46e5; }
                  pre { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; }
                  img { max-width: 100%; height: auto; border-radius: 8px; }
                  table { border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #e2e8f0; }
                  th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                  th { background-color: #f8fafc; font-weight: 600; }
                  .footer { margin-top: 3em; border-top: 1px solid #e2e8f0; padding-top: 1em; text-align: center; color: #94a3b8; font-size: 10px; }
                </style>
              </head>
              <body>
                ${contentHtml}
                <div class="footer">导出于 ${new Date().toLocaleString()}</div>
                <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
              </body>
            </html>
          `);
          printWindow.document.close();
          showToast('PDF 已就绪', 'success');
      } catch (err) {
          showToast('PDF 导出失败', 'error');
      } finally {
          setIsExportingPDF(null);
      }
  };

  const handleExportWord = async (msgId: string) => {
      const element = document.getElementById(`msg-${msgId}`);
      if (!element) return;
      const markdownBody = element.querySelector('.markdown-body');
      if (!markdownBody) return;

      setIsExportingWord(msgId);
      showToast('正在导出 Word...', 'info');

      try {
          const clone = markdownBody.cloneNode(true) as HTMLElement;
          const originalMermaids = markdownBody.querySelectorAll('.mermaid-container');
          const clonedMermaids = clone.querySelectorAll('.mermaid-container');

          for (let i = 0; i < originalMermaids.length; i++) {
              const original = originalMermaids[i] as HTMLElement;
              const cloned = clonedMermaids[i] as HTMLElement;
              if (original && cloned) {
                  const canvas = await html2canvas(original, { 
                      scale: 2, 
                      backgroundColor: '#ffffff',
                      onclone: (clonedDoc) => {
                          sanitizeOklchStyles(clonedDoc.body, clonedDoc);
                      }
                  });
                  cloned.innerHTML = `<div style="text-align:center;margin:15px 0;"><img src="${canvas.toDataURL('image/png')}" width="600" /></div>`;
              }
          }

          const htmlContent = clone.innerHTML;
          const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><style>
              body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #334155; }
              h1 { font-size: 24pt; border-bottom: 2px solid #eee; color: #0f172a; }
              h2, h3 { color: #0f172a; }
              p { line-height: 1.6; }
              pre { background: #f5f5f5; padding: 10pt; border: 1px solid #ddd; font-family: monospace; }
              code { color: #4f46e5; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
              table { border-collapse: collapse; width: 100%; margin: 15pt 0; border: 1px solid #ddd; }
              th, td { border: 1px solid #ddd; padding: 8pt; text-align: left; }
              th { background-color: #f9fafb; font-weight: bold; }
            </style></head><body>`;
          const postHtml = "</body></html>";
          
          const blob = new Blob(['\ufeff', preHtml + htmlContent + postHtml], { type: 'application/msword' });
          saveAs(blob, `AI-对话导出-${msgId.slice(0,8)}.doc`);
          showToast('Word 导出成功', 'success');
      } catch (error) {
          showToast('Word 导出失败', 'error');
      } finally {
          setIsExportingWord(null);
      }
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
            
          showToast(t('common.success'), 'success');
      } catch (error) {
          showToast(t('common.error'), 'error');
      }
  };

  const handleDeleteMessage = (msgId: string) => {
      setConfirmModal({
          isOpen: true,
          title: t('common.confirmDelete'),
          message: t('common.ai.assistant.confirmDeleteMsg'),
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
                  
                  // Filter out deleted message AND its replies
                  setMessages(prev => prev.filter(m => m.id !== msgId && !linkedIds.includes(m.id)));
                  showToast(t('common.success'), 'success');
              } catch (error) {
                  showToast(t('common.error'), 'error');
              }
          }
      });
  };

  if (isAgentsLoading) {
      return (
          <div className="flex items-center justify-center h-[calc(100vh-85px)]">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
      );
  }

  if (agents.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-85px)] text-slate-400">
              <Bot size={48} className="mb-4 opacity-50" />
              <p>暂无启用的 AI 助理</p>
              <p className="text-sm mt-2">请先在“系统管理 {'>'} AI Agent 管理”中配置并启用 Agent。</p>
          </div>
      );
  }

  return (
    <div className={`ai-assistant-chat flex bg-white dark:bg-slate-950 shadow-2xl shadow-indigo-500/5 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden transition-all duration-500 ease-in-out ${isFullScreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'h-[calc(100vh-100px)] rounded-[24px]'}`}>
      {/* Sidebar - Minimalist Agent Selection */}
      <div className="w-20 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-xl flex flex-col items-center py-8 gap-4 overflow-visible">
        <div className="flex-1 w-full px-2 space-y-4 overflow-y-auto no-scrollbar overflow-x-visible">
            {agents.map(agent => (
                <Tooltip key={agent.id} content={`${agent.name} - ${agent.role}`} side="right">
                    <div className="px-1">
                        <button
                            onClick={() => setActiveAgent(agent)}
                            className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 relative group ${
                                activeAgent?.id === agent.id 
                                ? 'bg-white dark:bg-slate-800 shadow-xl ring-1 ring-indigo-500/20 scale-110 text-indigo-600 dark:text-indigo-400' 
                                : 'hover:bg-white/80 dark:hover:bg-slate-800/50 text-slate-400 grayscale hover:grayscale-0'
                            }`}
                        >
                            <AgentAvatar name={agent.avatar} size={28} />
                            {activeAgent?.id === agent.id && (
                                <div className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full" />
                            )}
                        </button>
                    </div>
                </Tooltip>
            ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative">
        {/* Chat Header - Glassmorphism */}
        <div className="h-20 flex items-center justify-between px-8 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/30 dark:border-slate-800/30">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center shadow-inner animate-in zoom-in duration-500 text-indigo-600 dark:text-indigo-400">
                    <AgentAvatar name={activeAgent?.avatar} size={32} />
                </div>
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        {activeAgent?.name}
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h2>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{activeAgent?.role}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <Tooltip content="技能中心">
                    <button 
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-300"
                        onClick={() => setIsSkillsModalOpen(true)}
                    >
                        <Zap size={18} />
                    </button>
                </Tooltip>
                
                <Tooltip content="系统提示词">
                    <button 
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-300"
                        onClick={() => setIsSystemPromptModalOpen(true)}
                    >
                        <Info size={18} />
                    </button>
                </Tooltip>

                <div className="w-px h-4 bg-slate-300/30 dark:bg-slate-700/30 mx-1" />
                
                <Tooltip content="清空对话">
                    <button 
                        onClick={handleClear}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-300"
                    >
                        <Eraser size={18} />
                    </button>
                </Tooltip>

                <Tooltip content={isFullScreen ? "退出全屏" : "全屏模式"}>
                    <button 
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-300"
                    >
                        {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </Tooltip>
            </div>
        </div>

        {/* Messages - Clean and Spacious */}
        <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-8 space-y-10 scroll-smooth no-scrollbar"
        >
            <div ref={messagesContentRef} className="max-w-4xl mx-auto space-y-12 pb-10">
                {isHistoryLoading && (
                    <div className="flex justify-center py-4">
                         <Loader2 className="w-6 h-6 text-indigo-500 animate-spin opacity-50" />
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} id={`msg-${msg.id}`} className={`flex gap-6 group animate-in fade-in slide-in-from-bottom-4 duration-700 ${msg.role === 'user' ? 'flex-row-reverse' : 'items-start'}`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform duration-500 group-hover:scale-110 ${
                            msg.role === 'user' 
                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400'
                        }`}>
                            {msg.role === 'user' ? <User size={20} /> : <AgentAvatar name={activeAgent?.avatar} size={24} />}
                        </div>
                        
                        <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-3 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {msg.role === 'user' ? 'You' : activeAgent?.name}
                                </span>
                                <span className="text-[10px] text-slate-300 dark:text-slate-600">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            
                            <div className={`relative px-6 py-4 transition-all duration-500 ai-message-bubble ${
                                msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-[24px] rounded-tr-none shadow-xl shadow-indigo-500/10'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[24px] rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-sm'
                            }`}>
                                <div className={`markdown-body max-w-none break-words text-[15px] leading-snug selection:bg-indigo-200 dark:selection:bg-indigo-500/30 ${msg.role === 'user' ? '[&_*]:text-white' : ''}`}>
                                    {/* Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            {msg.attachments.map((att, idx) => (
                                                <div key={idx} className="overflow-hidden rounded-2xl border border-white/20 shadow-sm transition-transform hover:scale-[1.02]">
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
                                    <Markdown 
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
                                                return <code className="px-1.5 py-0.5 rounded-md bg-slate-200/50 dark:bg-slate-800/50 text-indigo-600 dark:text-indigo-400 font-mono text-[0.9em]" {...props}>{children}</code>;
                                            }
                                        }}
                                    >
                                        {msg.content}
                                    </Markdown>
                                </div>
                            </div>

                            {/* Actions below the bubble */}
                            <div className={`flex items-center gap-1.5 px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-300 ${msg.role === 'user' ? 'flex-row justify-start' : 'flex-row justify-end'}`}>
                                {msg.role === 'user' ? (
                                    <>
                                        <Tooltip content="复制">
                                            <button onClick={() => handleCopy(msg.content)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                <Copy size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="保存为提示词">
                                            <button onClick={() => handleSavePrompt(msg.content)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                <Save size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="删除">
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </Tooltip>
                                    </>
                                ) : (
                                    <>
                                        <Tooltip content="复制">
                                            <button onClick={() => handleCopy(msg.content)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                <Copy size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="删除">
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="截图">
                                            <button 
                                                onClick={() => handleScreenshot(`msg-${msg.id}`)} 
                                                disabled={isCapturing === msg.id}
                                                className={`p-1.5 rounded-lg transition-all duration-300 ${
                                                    isCapturing === msg.id 
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-90' 
                                                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
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
                                        <Tooltip content="导出 PDF">
                                            <button 
                                                onClick={() => handleExportPDF(msg.id)} 
                                                disabled={isExportingPDF === msg.id}
                                                className={`p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all ${isExportingPDF === msg.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                                            >
                                                {isExportingPDF === msg.id ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <FileText size={14} />}
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="导出 Word">
                                            <button 
                                                onClick={() => handleExportWord(msg.id)} 
                                                disabled={isExportingWord === msg.id}
                                                className={`p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all ${isExportingWord === msg.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                                            >
                                                {isExportingWord === msg.id ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <Download size={14} />}
                                            </button>
                                        </Tooltip>
                                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-800 mx-1" />
                                        <Tooltip content="点赞">
                                            <button 
                                                onClick={() => handleFeedback(msg.id, 'like')}
                                                className={`p-1.5 rounded-lg transition-all ${msg.feedback === 'like' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                <ThumbsUp size={14} fill={msg.feedback === 'like' ? 'currentColor' : 'none'} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="踩一踩">
                                            <button 
                                                onClick={() => handleFeedback(msg.id, 'dislike')}
                                                className={`p-1.5 rounded-lg transition-all ${msg.feedback === 'dislike' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                <ThumbsDown size={14} fill={msg.feedback === 'dislike' ? 'currentColor' : 'none'} />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-6 animate-pulse">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                            {activeAgent?.avatar}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-[24px] rounded-tl-none px-8 py-4 flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Thinking</span>
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-indigo-500/70 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area - Floating Capsule */}
        <div className="px-8 pb-3 pt-2 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-950 dark:via-slate-950/90 dark:to-transparent z-40">
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Quick Prompts - Elegant Pills */}
                {prompts.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                        {prompts.map(prompt => (
                            <button
                                key={prompt.id}
                                onClick={() => setInput(prompt.content)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-2xl whitespace-nowrap hover:bg-white dark:hover:bg-slate-800 transition-all border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5"
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
                        <div className="absolute bottom-full left-0 right-0 mb-4 flex gap-3 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                            {attachments.map(att => (
                                <div key={att.id} className="relative group shrink-0 transition-transform hover:scale-105">
                                    {att.type === 'image' ? (
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white dark:border-slate-800 shadow-md bg-slate-100">
                                            <img src={att.preview} alt="preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl border border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-md flex flex-col items-center justify-center p-2 text-center">
                                            <FileIcon size={24} className="text-indigo-500 mb-1" />
                                            <span className="text-[10px] text-slate-500 truncate w-full font-medium">{att.file.name}</span>
                                        </div>
                                    )}
                                    <button onClick={() => removeAttachment(att.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="relative flex items-end gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-indigo-500/5 rounded-[28px] p-2 pr-4 transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50">
                        <Tooltip content="上传文件">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-[20px] transition-all"
                            >
                                <Paperclip size={20} />
                            </button>
                        </Tooltip>
                        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json,.ts,.js,.tsx" />
                        
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={`Message ${activeAgent?.name}...`}
                            rows={1}
                            className="flex-1 py-3.5 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-none focus:ring-0 outline-none resize-none max-h-48 min-h-[52px] text-[15px] leading-relaxed"
                        />

                        <div className="flex items-center gap-2 pb-1.5">
                            <Tooltip content="优化提问">
                                <button 
                                    onClick={handleOptimize}
                                    disabled={isOptimizing || !input.trim()}
                                    className={`p-2.5 rounded-xl transition-all ${isOptimizing ? 'text-indigo-600 bg-indigo-50 animate-pulse' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                                >
                                    {isOptimizing ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                                </button>
                            </Tooltip>
                            
                            <button
                                onClick={handleSend}
                                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                                className="w-11 h-11 bg-indigo-600 text-white rounded-[18px] flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <SkillsCenterModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
      />
      <SystemPromptModal
        isOpen={isSystemPromptModalOpen}
        onClose={() => setIsSystemPromptModalOpen(false)}
        agent={activeAgent}
      />
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

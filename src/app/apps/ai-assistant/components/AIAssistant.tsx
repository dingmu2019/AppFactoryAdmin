
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { useToast, useI18n, usePageHeader } from '@/contexts';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { SkillsCenterModal } from './SkillsCenterModal';
import { SystemPromptModal } from './SystemPromptModal';
import { PromptFormModal } from '@/app/sys/prompts/components/PromptFormModal';
import { fetchPromptCategories, createPrompt, type PromptCategory } from '@/services/promptService';
import { Sidebar } from './Sidebar';
import { ChatHeader } from './ChatHeader';
import { AgentAvatar } from '@/components/AgentAvatar';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { useChat } from '../hooks/useChat';
import type { Agent, Attachment } from '../types';
import { sanitizeOklchStyles, downloadPng } from '../utils/exportUtils';

export const AIAssistant: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader(t('common.ai.chat'), t('common.ai.assistant.chatPlaceholder'));
  }, [setPageHeader, t]);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [isAgentsLoading, setIsAgentsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isSystemPromptModalOpen, setIsSystemPromptModalOpen] = useState(false);
  
  // Prompt Crystallization State
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [crystallizing, setCrystallizing] = useState(false);
  const [promptFormData, setPromptFormData] = useState({
      title: '',
      original_content: '',
      optimized_content: '',
      tags: '',
      category_id: ''
  });

  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages, setMessages,
    isLoading,
    attachments, setAttachments,
    prompts, // setPrompts,
    isHistoryLoading,
    messagesContainerRef,
    messagesContentRef,
    handleScroll,
    handleSend
  } = useChat(activeAgent);

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
        if (data && data.length > 0) setActiveAgent(data[0]);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setIsAgentsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const newAttachments: Attachment[] = [];
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                showToast(t('apps.aiAssistant.upload.fileTooLarge10mb', { name: file.name }), 'error');
                continue;
            }
            const isImage = file.type.startsWith('image/');
            const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js') || file.name.endsWith('.sql') || file.name.endsWith('.csv');
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
                } catch (e) { console.warn('Failed to read text file', e); }
            }
            newAttachments.push({ id: Math.random().toString(36).substr(2, 9), file, preview, content, type: isImage ? 'image' : isText ? 'text' : 'file' });
        }
        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOptimize = useCallback(async (content: string) => {
      if (!content.trim()) return null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const apiUrl = baseUrl ? `${baseUrl}/api/ai/chat/optimize` : '/api/ai/chat/optimize';
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (data.content) {
            showToast(t('common.success'), 'success');
            return data.content as string;
        }
        return null;
      } catch (err) {
          console.error(err);
          showToast(t('common.error'), 'error');
          return null;
      }
  }, [showToast, t]);

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
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
                const apiUrl = baseUrl ? `${baseUrl}/api/ai/chat/history` : '/api/ai/chat/history';
                const res = await fetch(`${apiUrl}?agentId=${encodeURIComponent(activeAgent.id)}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                });
                if (!res.ok) throw new Error('Failed to clear');
                setMessages([{ id: 'welcome', role: 'assistant', content: `Hi! I am **${activeAgent.name}**, ${activeAgent.role}.\n\n${activeAgent.description || 'How can I help you?'}`, timestamp: Date.now() }]);
                showToast(t('common.success'), 'success');
            } catch (error) { console.error(error); showToast(t('common.error'), 'error'); }
        }
    });
  };

  const handleScreenshot = async (elementId: string) => {
      const msgId = elementId.replace('msg-', '');
      const element = document.getElementById(elementId);
      if (!element) return;
      try {
          setIsCapturing(msgId);
          const bubble = element.querySelector('.ai-message-bubble') as HTMLElement;
          if (!bubble) { showToast(t('common.ai.assistant.noContent'), 'error'); return; }
          showToast(t('common.ai.assistant.preparingScreenshot'), 'info');
          const clone = bubble.cloneNode(true) as HTMLElement;
          clone.setAttribute('data-h2c-root', msgId);
          clone.style.position = 'fixed'; clone.style.top = '0'; clone.style.left = '0';
          clone.style.width = bubble.offsetWidth + 'px'; clone.style.zIndex = '-9999'; clone.style.opacity = '1'; clone.style.visibility = 'visible';
          clone.style.transform = 'none'; clone.style.transition = 'none'; clone.style.borderRadius = '12px'; clone.style.boxSizing = 'border-box'; clone.style.paddingBottom = '24px';
          const isDark = document.documentElement.classList.contains('dark');
          const bubbleStyle = window.getComputedStyle(bubble);
          const bubbleBg = bubbleStyle.backgroundColor && bubbleStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bubbleStyle.backgroundColor : (isDark ? '#0f172a' : '#ffffff');
          clone.style.backgroundColor = bubbleBg; clone.style.color = bubbleStyle.color || (isDark ? '#f1f5f9' : '#0f172a');
          document.body.appendChild(clone);
          
          // Sanitize styles for Tailwind v4 compatibility
          sanitizeOklchStyles(clone, document);

          const originalMermaids = bubble.querySelectorAll('.mermaid-container');
          const clonedMermaids = clone.querySelectorAll('.mermaid-container');
          for (let i = 0; i < originalMermaids.length; i++) {
              const original = originalMermaids[i] as HTMLElement;
              const cloned = clonedMermaids[i] as HTMLElement;
              if (original && cloned) {
                  try {
                      const originalStyle = window.getComputedStyle(original);
                      const mermaidBg = originalStyle.backgroundColor && originalStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? originalStyle.backgroundColor : (isDark ? '#0f172a' : '#ffffff');
                      let dataUrl = '';
                      try {
                          dataUrl = await toPng(original, { cacheBust: true, pixelRatio: 2, backgroundColor: mermaidBg, style: { transform: 'none', transition: 'none' } });
                      } catch {
                          const canvas = await html2canvas(original, { backgroundColor: mermaidBg, scale: 2, useCORS: true, logging: false, onclone: (clonedDoc) => sanitizeOklchStyles(clonedDoc.body, clonedDoc) });
                          dataUrl = canvas.toDataURL('image/png');
                      }
                      cloned.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: auto; display: block; border-radius: 8px;" />`;
                      cloned.style.background = mermaidBg; cloned.style.padding = '0';
                  } catch (e) { console.warn('Failed to capture mermaid', e); }
              }
          }

          await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          const width = Math.ceil(clone.scrollWidth);
          const height = Math.ceil(clone.scrollHeight);
          const dataUrl = await toPng(clone, { cacheBust: true, pixelRatio: 2, backgroundColor: bubbleBg, width, height, canvasWidth: width, canvasHeight: height, style: { transform: 'none', transition: 'none', borderRadius: '12px' }, filter: (node) => !(node instanceof HTMLElement && (node.tagName === 'BUTTON' || (node.classList.contains('absolute') && node.classList.contains('-bottom-8')))) });
          document.body.removeChild(clone);

          try {
              if (!document.hasFocus() || !navigator.clipboard) { downloadPng(dataUrl, `ai-screenshot-${msgId}.png`); showToast(t('common.ai.assistant.screenshotFocusWarning'), 'success'); return; }
              const blob = await (await fetch(dataUrl)).blob();
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              showToast(t('common.ai.assistant.screenshotToClipboard'), 'success');
          } catch (e: any) { downloadPng(dataUrl, `ai-screenshot-${msgId}.png`); showToast(t('common.ai.assistant.screenshotCopyFailed'), 'success'); }
      } catch (error) { console.error('Screenshot failed:', error); showToast(t('common.ai.assistant.screenshotFailed'), 'error'); } finally { setIsCapturing(null); }
  };

  const handleExportPDF = async (msgId: string) => {
      const element = document.getElementById(`msg-${msgId}`);
      if (!element) return;
      const bubble = element.querySelector('.ai-message-bubble') as HTMLElement;
      if (!bubble) return;
      
      setIsExportingPDF(msgId);
      showToast(t('common.ai.assistant.generatingPDF'), 'info');
      
      try {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
              throw new Error('Popup blocked');
          }

          // Clone the content and clean up interactive elements
          const contentClone = bubble.cloneNode(true) as HTMLElement;
          // Remove buttons, absolute toolbars, and lucide icons that shouldn't be in the PDF
          contentClone.querySelectorAll('button, .absolute, .lucide, [role="tooltip"]').forEach(el => el.remove());
          
          const bubbleHtml = contentClone.innerHTML;
          const isDark = document.documentElement.classList.contains('dark');
          const agentName = activeAgent?.name || 'AI Assistant';

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>AI Chat Export - ${agentName}</title>
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    padding: 40px; 
                    line-height: 1.6; 
                    color: #1e293b; 
                    background: #fff;
                    max-width: 850px;
                    margin: 0 auto;
                    -webkit-print-color-adjust: exact;
                  }
                  .export-container {
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 40px;
                    background: #fff;
                    position: relative;
                  }
                  .header {
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  }
                  .header-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #4f46e5;
                  }
                  .header-meta {
                    font-size: 12px;
                    color: #94a3b8;
                  }
                  .markdown-body { 
                    font-size: 15px; 
                  }
                  .markdown-body h1 { font-size: 2em; margin-top: 0; margin-bottom: 16px; font-weight: 700; color: #0f172a; }
                  .markdown-body h2 { font-size: 1.5em; margin-top: 24px; margin-bottom: 16px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
                  .markdown-body h3 { font-size: 1.25em; margin-top: 24px; margin-bottom: 16px; font-weight: 600; color: #0f172a; }
                  .markdown-body p { margin-bottom: 16px; }
                  .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 16px; }
                  .markdown-body li { margin-bottom: 4px; }
                  .markdown-body pre { 
                    background: #0f172a; 
                    color: #f8fafc; 
                    padding: 20px; 
                    border-radius: 12px; 
                    overflow-x: auto; 
                    margin: 20px 0; 
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                    font-size: 13px;
                    line-height: 1.5;
                  }
                  .markdown-body code { 
                    background: #f1f5f9; 
                    padding: 3px 6px; 
                    border-radius: 6px; 
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 0.85em; 
                    color: #4f46e5; 
                  }
                  .markdown-body table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 24px 0; 
                    font-size: 14px;
                  }
                  .markdown-body th, .markdown-body td { 
                    border: 1px solid #e2e8f0; 
                    padding: 12px; 
                    text-align: left; 
                  }
                  .markdown-body th { 
                    background: #f8fafc; 
                    font-weight: 600; 
                    color: #334155;
                  }
                  .markdown-body blockquote { 
                    border-left: 4px solid #4f46e5; 
                    padding: 8px 20px; 
                    color: #475569; 
                    background: #f8fafc;
                    border-radius: 0 8px 8px 0;
                    margin: 20px 0; 
                  }
                  .markdown-body img { max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; }
                  
                  /* System2 深度思考优化样式 */
                  .markdown-body div[class*="border-l-2"] {
                    border-left-color: #6366f1 !important;
                    margin-bottom: 24px !important;
                  }
                  .markdown-body div[class*="bg-zinc-50"] {
                    background-color: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    border-left: 4px solid #6366f1 !important;
                    border-radius: 12px !important;
                    padding: 16px 20px !important;
                    color: #64748b !important;
                    font-style: italic !important;
                    font-size: 13px !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02) !important;
                  }
                  .markdown-body button {
                    color: #6366f1 !important;
                    font-weight: 800 !important;
                    font-size: 11px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    margin-bottom: 8px !important;
                    border: none !important;
                    background: none !important;
                    padding: 0 !important;
                  }
                  .markdown-body button div {
                    width: 6px !important;
                    height: 6px !important;
                    background-color: #6366f1 !important;
                    border-radius: 50% !important;
                  }

                  .mermaid-container { 
                    text-align: center; 
                    margin: 30px 0; 
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                  }
                  .mermaid-container svg { max-width: 100%; height: auto; }
                  
                  @media print {
                    body { padding: 0; }
                    .export-container { border: none; box-shadow: none; padding: 0; }
                    .header { margin-bottom: 40px; }
                    @page { margin: 20mm; size: A4; }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="header-title">MC-CWIN AI ASSISTANT</div>
                  <div class="header-meta">Exported on ${new Date().toLocaleString()}</div>
                </div>
                <div class="export-container">
                  <div class="markdown-body">
                    ${bubbleHtml}
                  </div>
                </div>
                <script>
                  window.onload = () => {
                    setTimeout(() => {
                      window.print();
                      // Optional: Close window after printing
                      // window.onfocus = () => window.close();
                    }, 800);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
          showToast(t('common.ai.assistant.pdfSuccess'), 'success');
      } catch (err) { 
          console.error('PDF Export failed:', err);
          showToast(t('common.ai.assistant.pdfFailed'), 'error'); 
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
      showToast(t('common.ai.assistant.exportingWord'), 'info');
      try {
          const clone = markdownBody.cloneNode(true) as HTMLElement;
          
          // Remove any action buttons or tooltips that might have been cloned
          clone.querySelectorAll('button, .absolute').forEach(el => el.remove());

          const originalMermaids = markdownBody.querySelectorAll('.mermaid-container');
          const clonedMermaids = clone.querySelectorAll('.mermaid-container');
          for (let i = 0; i < originalMermaids.length; i++) {
              const original = originalMermaids[i] as HTMLElement;
              const cloned = clonedMermaids[i] as HTMLElement;
              if (original && cloned) {
                  try {
                    const canvas = await html2canvas(original, { scale: 2, backgroundColor: '#ffffff', onclone: (clonedDoc) => sanitizeOklchStyles(clonedDoc.body, clonedDoc) });
                    cloned.innerHTML = `<div style="text-align:center;margin:15px 0;"><img src="${canvas.toDataURL('image/png')}" width="600" /></div>`;
                  } catch (e) { console.warn('Failed to convert mermaid to image for Word', e); }
              }
          }
          const htmlContent = clone.innerHTML;
          const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #334155; } h1 { font-size: 24pt; border-bottom: 2px solid #eee; color: #0f172a; } h2, h3 { color: #0f172a; margin-top: 20pt; } p { line-height: 1.6; margin-bottom: 10pt; } pre { background: #f5f5f5; padding: 10pt; border: 1px solid #ddd; font-family: 'Courier New', monospace; } code { color: #4f46e5; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; } table { border-collapse: collapse; width: 100%; margin: 15pt 0; border: 1px solid #ddd; } th, td { border: 1px solid #ddd; padding: 8pt; text-align: left; } th { background-color: #f9fafb; font-weight: bold; }</style></head><body>`;
          const postHtml = "</body></html>";
          const blob = new Blob(['\ufeff', preHtml + htmlContent + postHtml], { type: 'application/msword' });
          saveAs(blob, `AI-Chat-Export-${new Date().getTime()}.doc`);
          showToast(t('common.ai.assistant.wordSuccess'), 'success');
      } catch (error) { 
          console.error('Word Export failed:', error);
          showToast(t('common.ai.assistant.wordFailed'), 'error'); 
      } finally { 
          setIsExportingWord(null); 
      }
  };

  const handleSavePrompt = async (content: string) => {
      // 这里的 content 是原始消息内容
      // 我们打开 Prompt Modal 让用户编辑和保存
      try {
          // 获取分类
          const cats = await fetchPromptCategories();
          setPromptCategories(cats);
          
          setPromptFormData({
              title: '',
              original_content: content,
              optimized_content: '',
              tags: 'AI-Extracted, Chat-History',
              category_id: ''
          });
          setIsPromptModalOpen(true);
      } catch (error) {
          showToast(t('common.error'), 'error');
      }
  };

  const handleCrystallize = async () => {
      // 获取当前上下文（最后 5 条消息）作为蓝图
      if (messages.length === 0) return;
      
      setCrystallizing(true);
      try {
          const cats = await fetchPromptCategories();
          setPromptCategories(cats);
          
          // 简单的将最近对话合并为上下文
          const context = messages
              .filter(m => m.id !== 'welcome')
              .slice(-5)
              .map(m => `${m.role.toUpperCase()}: ${m.content}`)
              .join('\n\n');
          
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          // 调用 AI 优化接口生成 Prompt 蓝图
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
          const apiUrl = baseUrl ? `${baseUrl}/api/ai/chat/optimize` : '/api/ai/chat/optimize';
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ 
                content: t('common.ai.assistant.crystallizePrompt', { context }),
                mode: 'crystallize'
            })
          });
          
          const data = await res.json();
          const optimized = data.content || context;

          setPromptFormData({
              title: `Crystallized Pattern ${new Date().toLocaleDateString()}`,
              original_content: context,
              optimized_content: optimized,
              tags: 'Hassabis-Pattern, Auto-Extraction',
              category_id: ''
          });
          
          setIsPromptModalOpen(true);
      } catch (error) {
          console.error(error);
          showToast(t('common.error'), 'error');
      } finally {
          setCrystallizing(false);
      }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await createPrompt({
              title: promptFormData.title,
              original_content: promptFormData.original_content,
              optimized_content: promptFormData.optimized_content,
              tags: promptFormData.tags.split(',').map(t => t.trim()).filter(Boolean),
              category_id: promptFormData.category_id || undefined
          });
          showToast(t('prompts.messages.saveSuccess'), 'success');
          setIsPromptModalOpen(false);
      } catch (error) {
          showToast(t('prompts.messages.saveFailed'), 'error');
      }
  };

  const handleDeleteMessage = (msgId: string) => {
      setConfirmModal({
          isOpen: true,
          title: t('common.confirmDelete'),
          message: t('common.ai.assistant.confirmDeleteMsg'),
          onConfirm: async () => {
              try {
                  await supabase.from('ai_chat_messages').update({ is_deleted: true }).eq('id', msgId);
                  const { data: linkedMessages } = await supabase.from('ai_chat_messages').update({ is_deleted: true }).eq('reply_to', msgId).select('id');
                  const linkedIds = linkedMessages?.map(m => m.id) || [];
                  setMessages(prev => prev.filter(m => m.id !== msgId && !linkedIds.includes(m.id)));
                  showToast(t('common.success'), 'success');
              } catch (error) { showToast(t('common.error'), 'error'); }
          }
      });
  };

  const handleFeedback = async (msgId: string, type: 'like' | 'dislike') => {
      try {
          await supabase.from('ai_chat_messages').update({ feedback: type }).eq('id', msgId);
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));
          showToast(type === 'like' ? t('common.ai.assistant.like') : t('common.ai.assistant.dislike'), 'success');
      } catch (error) { showToast(t('common.error'), 'error'); }
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast(t('common.copySuccess'), 'success');
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          showToast(t('common.copySuccess'), 'success');
        } catch (err) {
          console.error('Fallback copy failed', err);
          showToast(t('common.copyFailed'), 'error');
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Copy failed', err);
      showToast(t('common.copyFailed'), 'error');
    }
  };

  if (isAgentsLoading) return <div className="flex items-center justify-center h-[calc(100vh-85px)]"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (agents.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-85px)] text-zinc-400">
      <Bot size={48} className="mb-4 opacity-50" />
      <p>{t('common.ai.assistant.empty')}</p>
      <p className="text-sm mt-2">{t('common.ai.assistant.emptyDesc')}</p>
    </div>
  );

  return (
    <div className={`ai-assistant-chat flex bg-white dark:bg-zinc-950 shadow-2xl shadow-indigo-500/5 border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden transition-all duration-500 ease-in-out ${isFullScreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'h-[calc(100vh-100px)] rounded-lg'}`}>
      <Sidebar agents={agents} activeAgent={activeAgent} onSelectAgent={setActiveAgent} />
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">
        <ChatHeader 
            activeAgent={activeAgent} 
            isFullScreen={isFullScreen} 
            setIsFullScreen={setIsFullScreen} 
            setIsSkillsModalOpen={setIsSkillsModalOpen} 
            setIsSystemPromptModalOpen={setIsSystemPromptModalOpen} 
            onClear={handleClear} 
            onCrystallize={handleCrystallize}
        />
        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth no-scrollbar">
            <div ref={messagesContentRef} className="max-w-4xl mx-auto space-y-8 pb-10">
                {isHistoryLoading && <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin opacity-50" /></div>}
                {messages.map((msg) => (
                    <MessageItem key={msg.id} msg={msg} activeAgent={activeAgent} isCapturing={isCapturing} isExportingPDF={isExportingPDF} isExportingWord={isExportingWord} onCopy={handleCopy} onSavePrompt={handleSavePrompt} onDelete={handleDeleteMessage} onScreenshot={handleScreenshot} onExportPDF={handleExportPDF} onExportWord={handleExportWord} onFeedback={handleFeedback} />
                ))}
                {isLoading && (
                    <div className="flex gap-6 animate-pulse items-center">
                        <AgentAvatar name={activeAgent?.avatar} size={32} />
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg rounded-tl-none px-6 py-2.5 flex items-center gap-3">
                            <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Thinking</span>
                            <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-indigo-500/70 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" /></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <ChatInput prompts={prompts} attachments={attachments} isLoading={isLoading} activeAgent={activeAgent} onSend={handleSend} onFileSelect={handleFileSelect} onRemoveAttachment={(id) => setAttachments(prev => prev.filter(a => a.id !== id))} onOptimize={handleOptimize} fileInputRef={fileInputRef} inputRef={inputRef} />
      </div>
      <SkillsCenterModal isOpen={isSkillsModalOpen} onClose={() => setIsSkillsModalOpen(false)} />
      <SystemPromptModal isOpen={isSystemPromptModalOpen} onClose={() => setIsSystemPromptModalOpen(false)} agent={activeAgent} />
      <PromptFormModal
          isOpen={isPromptModalOpen}
          onClose={() => setIsPromptModalOpen(false)}
          onSubmit={handlePromptSubmit}
          isEditing={false}
          isCreating={crystallizing}
          formData={promptFormData}
          setFormData={setPromptFormData}
          categories={promptCategories}
      />
      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
};

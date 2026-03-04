
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useToast, useI18n } from '../../../../contexts';
import { callLLM, type ChatMessage as LLMChatMessage } from '../../../../lib/ai/client';
import type { Agent, Prompt, Message, Attachment } from '../types';

export const useChat = (activeAgent: Agent | null) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  
  const isAgentChanging = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Fetch Prompts and History when Agent changes
  useEffect(() => {
    if (!activeAgent) return;
    
    setMessages([]); 
    isAgentChanging.current = true;

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: promptsData } = await supabase
        .from('agent_prompts')
        .select('*')
        .eq('agent_id', activeAgent.id);
      setPrompts(promptsData || []);

      const { data: historyData, error: historyError } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('agent_id', activeAgent.id)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (historyError) {
          console.error('Failed to load chat history:', historyError);
      }
        
      if (historyData && historyData.length > 0) {
          const mappedMessages: Message[] = historyData.reverse().map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at).getTime(),
              feedback: msg.feedback as 'like' | 'dislike' | undefined,
              attachments: msg.attachments || [],
              prompt_tokens: msg.prompt_tokens,
              completion_tokens: msg.completion_tokens
          }));
          setMessages(mappedMessages);
      } else {
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

  // Scroll logic
  const handleScroll = async () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (!isHistoryLoading) {
          isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
      }
      if (scrollTop === 0 && !isHistoryLoading && messages.length > 0 && messages[0].id !== 'welcome') {
          prevScrollHeightRef.current = scrollHeight;
          setIsHistoryLoading(true);
          await handleLoadMore();
      }
  };

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
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .lt('created_at', oldestDate)
        .order('created_at', { ascending: false })
        .limit(10);
      if (moreError) {
          console.error('Failed to load more messages:', moreError);
          setIsHistoryLoading(false);
          return;
      }
      if (moreData && moreData.length > 0) {
          const mappedMore: Message[] = moreData.reverse().map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at).getTime(),
              feedback: msg.feedback as 'like' | 'dislike' | undefined,
              attachments: msg.attachments || [],
              prompt_tokens: msg.prompt_tokens,
              completion_tokens: msg.completion_tokens
          }));
          setMessages(prev => [...mappedMore, ...prev]);
      } else {
          setIsHistoryLoading(false);
      }
  };

  useLayoutEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) return;
      if (prevScrollHeightRef.current > 0) {
          const newScrollHeight = container.scrollHeight;
          const diff = newScrollHeight - prevScrollHeightRef.current;
          if (diff > 0) container.scrollTop = diff;
          prevScrollHeightRef.current = 0;
          setIsHistoryLoading(false);
          return;
      }
      if (isAgentChanging.current) {
          container.scrollTop = container.scrollHeight;
          setTimeout(() => { isAgentChanging.current = false; }, 100);
          isAtBottomRef.current = true;
          return;
      }
      if (isAtBottomRef.current) {
          container.scrollTop = container.scrollHeight;
      }
  }, [messages]);

  useEffect(() => {
      const content = messagesContentRef.current;
      if (!content) return;
      const observer = new ResizeObserver(() => {
          if (isAtBottomRef.current && messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
      });
      observer.observe(content);
      return () => observer.disconnect();
  }, []);

  const saveMessageToDB = async (role: 'user' | 'assistant', content: string, replyTo?: string, msgAttachments?: any[], promptTokens?: number, completionTokens?: number) => {
      if (!activeAgent) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const payload: any = {
        agent_id: activeAgent.id,
        user_id: user.id,
        role,
        content,
        attachments: msgAttachments || [],
        prompt_tokens: promptTokens || 0,
        completion_tokens: completionTokens || 0
      };
      if (replyTo) payload.reply_to = replyTo;
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert(payload)
        .select()
        .single();
      if (error) {
          console.error('Failed to save message:', error);
          return null;
      }
      return data;
  };

  const handleSend = async (content: string) => {
    if ((!content.trim() && attachments.length === 0) || !activeAgent) return { ok: false as const };
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);

    const uploadedAttachments: Attachment[] = [];
    const llmContentParts: any[] = [];
    if (content) llmContentParts.push({ type: 'text', text: content });

    if (currentAttachments.length > 0) {
        for (const att of currentAttachments) {
            try {
                // Mock upload for now or implement real upload
                const fileExt = att.file?.name.split('.').pop() || 'file';
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `${activeAgent.id}/${fileName}`;
                
                // Ensure file exists
                if (!att.file) continue;

                const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, att.file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
                
                uploadedAttachments.push({ 
                    id: att.id,
                    type: att.type, 
                    url: publicUrl, 
                    name: att.file.name 
                });

                if (att.type === 'image') {
                    llmContentParts.push({ type: 'image_url', image_url: { url: att.preview || publicUrl } });
                } else if (att.type === 'text' && att.content) {
                    llmContentParts.push({ type: 'text', text: `\n\n--- File: ${att.file.name} (${publicUrl}) ---\n${att.content}\n--- End of File ---\n` });
                } else {
                    llmContentParts.push({ type: 'text', text: `\n[User uploaded file: ${att.file.name} (${publicUrl})]` });
                }
            } catch (err) {
                console.error('Upload failed', err);
            }
        }
    }

    const tempUserMsgId = Date.now().toString();
    const userMsg: Message = { id: tempUserMsgId, role: 'user', content: content, timestamp: Date.now(), attachments: uploadedAttachments };
    setMessages(prev => [...prev, userMsg]);

    try {
      const savedUserMsg = await saveMessageToDB('user', content, undefined, uploadedAttachments);
      if (savedUserMsg) setMessages(prev => prev.map(m => m.id === tempUserMsgId ? { ...m, id: savedUserMsg.id } : m));
      const detailedHistoryContext: LLMChatMessage[] = messages.slice(-10).map(m => {
          if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
             const parts: any[] = [{ type: 'text', text: m.content }];
             m.attachments.forEach(att => {
                 if (att.type === 'image') parts.push({ type: 'image_url', image_url: { url: att.url } });
                 else parts.push({ type: 'text', text: `[Attachment: ${att.name}]` });
             });
             return { role: 'user', content: parts };
          }
          return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
      });
      detailedHistoryContext.push({ role: 'user', content: llmContentParts });

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
      const aiResult = await callLLM(detailedHistoryContext, dynamicSystemPrompt, activeAgent.id);
      const savedAiMsg = await saveMessageToDB('assistant', aiResult.content, savedUserMsg?.id, undefined, aiResult.usage?.promptTokens, aiResult.usage?.completionTokens);
      const aiResponse: Message = { 
          id: savedAiMsg?.id || (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: aiResult.content, 
          timestamp: Date.now(),
          prompt_tokens: aiResult.usage?.promptTokens,
          completion_tokens: aiResult.usage?.completionTokens
      };
      setMessages(prev => [...prev, aiResponse]);
      return { ok: true as const };
    } catch (error: any) {
      console.error('Chat error:', error);
      showToast(error.message || t('common.ai.assistant.sendFailed'), 'error');
      setAttachments(currentAttachments);
      return { ok: false as const, restoreInput: content };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages, setMessages,
    isLoading,
    attachments, setAttachments,
    prompts, setPrompts,
    isHistoryLoading,
    messagesContainerRef,
    messagesContentRef,
    handleScroll,
    handleSend
  };
};

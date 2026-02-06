import { supabase } from '../supabase';

export interface LLMConfig {
  provider: 'openai' | 'gemini' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export const fetchLLMConfig = async (): Promise<LLMConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('config')
      .eq('category', 'llm')
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      console.warn('No active LLM config found');
      return null;
    }

    const config = data.config;
    
    // Support new multi-model structure
    if (config.models && Array.isArray(config.models)) {
        // Find first enabled model or primary model (if we had such a flag)
        const activeModel = config.models.find((m: any) => m.enabled !== false);
        if (activeModel) {
            return activeModel as LLMConfig;
        }
        return null;
    }

    return config as LLMConfig;
  } catch (error) {
    console.error('Error fetching LLM config:', error);
    return null;
  }
};

export const callLLM = async (messages: ChatMessage[], systemPrompt?: string, agentId?: string): Promise<string> => {
  // Use Vite Backend API to bypass CORS
  try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
          'Content-Type': 'application/json'
      };

      if (token) {
          headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
              messages,
              systemPrompt,
              agentId // Pass agentId
          })
      });

      if (!response.ok) {
          const errorData = await response.text();
          // Try to parse JSON error if possible
          try {
              const jsonError = JSON.parse(errorData);
              throw new Error(jsonError.error || errorData);
          } catch {
              throw new Error(`API Error: ${response.status} - ${errorData}`);
          }
      }

      const data = await response.json();
      return data.content || '';
  } catch (error: any) {
      throw new Error(error.message || 'Failed to call AI service');
  }
};

// Legacy client-side calls (kept for reference or specific use cases)
export const callOpenAI = async (config: LLMConfig, messages: ChatMessage[]): Promise<string> => {
    try {
        let baseUrl = config.baseUrl ? config.baseUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
        // Auto-prepend https if missing protocol
        if (baseUrl && !baseUrl.startsWith('http')) {
            baseUrl = `https://${baseUrl}`;
        }

        console.log('[LLM] Calling URL:', `${baseUrl}/chat/completions`);

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || 'gpt-3.5-turbo',
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                temperature: 0.7
            })
        });

        if (!response.ok) {
            // Check if response is HTML (Next.js 404 page)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                 throw new Error(`Endpoint Not Found (404). Please check your Base URL setting. Current: ${baseUrl}`);
            }

            const error = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error: any) {
        throw new Error(`LLM Call Failed: ${error.message}`);
    }
};

export const callGemini = async (config: LLMConfig, messages: ChatMessage[]): Promise<string> => {
    // Basic Gemini implementation (Google REST API)
    // Note: Gemini uses a different message format
    try {
        const contents = messages
            .filter(m => m.role !== 'system') // Gemini system instruction is separate in newer API, but for simple REST, we might just prepend to first user message or use v1beta API
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
        
        // Handle System Prompt manually if needed or prepend
        const systemMsg = messages.find(m => m.role === 'system');
        if (systemMsg) {
            // Prepend to first user message for simplicity in this basic implementation
            // Or use system_instruction in v1beta
        }

        const url = `${config.baseUrl}/models/${config.model || 'gemini-pro'}:generateContent?key=${config.apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error: any) {
        throw new Error(`LLM Call Failed: ${error.message}`);
    }
};

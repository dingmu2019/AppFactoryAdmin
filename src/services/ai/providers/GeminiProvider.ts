
import type { AIProvider, AIRequest, AIResponse, ProviderConfig } from '../types';
import { EncryptionService } from '@/services/EncryptionService';

export class GeminiProvider implements AIProvider {
  id: string;
  name: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    // Decrypt API Key if it's encrypted
    const apiKey = config.apiKey && config.apiKey.includes(':') 
      ? EncryptionService.decrypt(config.apiKey) 
      : config.apiKey;

    this.config = { ...config, apiKey };
    this.id = config.id;
    this.name = `Gemini-${config.model}`;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    
    // Support for 3rd party providers (e.g. gptsapi.net) that use OpenAI-compatible auth or different URL structures
    // If the URL is fully specified (contains /models/), trust it more, but still need to handle the query param key vs header
    
    let url = '';
    
    if (baseUrl.includes('/models/')) {
        // If the user provided a full URL like ".../models/gemini-pro:generateContent"
        // We use it as is, but we might need to append key if it's not there
        url = baseUrl;
    } else {
        // Standard construction
        let cleanBaseUrl = baseUrl;
        if (cleanBaseUrl.endsWith('/')) cleanBaseUrl = cleanBaseUrl.slice(0, -1);
        url = `${cleanBaseUrl}/models/${this.config.model}:generateContent`;
    }

    if (url.includes('generativelanguage.googleapis.com') && !url.includes('key=')) {
         const separator = url.includes('?') ? '&' : '?';
         url = `${url}${separator}key=${this.config.apiKey}`;
    }
    // For other domains (proxies), we rely on headers, as per user's curl example.
    
    // Convert OpenAI-style messages to Gemini format
    const contents = request.messages.map(msg => {
      const parts: any[] = [];
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        msg.content.forEach(part => {
          if (part.type === 'text') {
             parts.push({ text: part.text || '' });
          } else if (part.type === 'image_url') {
             const url = part.image_url?.url || '';
             if (url.startsWith('data:')) {
                const mimeType = url.split(';')[0].split(':')[1];
                const data = url.split(',')[1];
                parts.push({
                    inlineData: {
                        mimeType,
                        data
                    }
                });
             } else if (url.startsWith('http')) {
                // For remote URLs, Gemini doesn't support them directly in parts usually (unless Vertex AI GCS).
                // We should ideally fetch it and convert to base64.
                // NOTE: This assumes the backend can access the URL.
                // For now, we skip auto-fetch to avoid SSRF/perf issues unless explicitly implemented.
                // A workaround is passing it as text if we can't fetch.
                parts.push({ text: `[Image: ${url}]` });
             }
          }
        });
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    if (request.systemPrompt) {
        // Gemini supports system instructions in a separate field in newer API versions
        // Or we can prepend to history. Using system_instruction if available or prepend.
        // For simplicity in this adapter, we'll prepend as a user message if API doesn't support system_instruction directly in v1beta easily without beta header sometimes.
        // But v1beta/models/gemini-1.5-pro:generateContent supports systemInstruction.
    }

    const payload: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens,
      }
    };

    if (request.systemPrompt) {
        payload.systemInstruction = {
            parts: [{ text: request.systemPrompt }]
        };
    }

    if (request.tools && request.tools.length > 0) {
        // Convert OpenAI tools to Gemini function declarations
        // This is complex mapping. For MVP, we might assume tools are already in Gemini format 
        // OR skip tool support in fallback for now if complexity is high.
        // Let's implement basic tool support if format matches or generic mapping.
        // OpenAI: { type: 'function', function: { name, description, parameters } }
        // Gemini: { function_declarations: [ { name, description, parameters } ] }
        
        const function_declarations = request.tools.map(t => t.function);
        payload.tools = [{ function_declarations }];
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as any;
      
      // Handle safety ratings blocking
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Gemini blocked content: ${data.promptFeedback.blockReason}`);
      }

      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error('Gemini returned no candidates');
      }

      const content = candidate.content?.parts?.[0]?.text || '';
      
      // Handle function calls in response
      let toolCalls = undefined;
      const functionCall = candidate.content?.parts?.[0]?.functionCall;
      if (functionCall) {
          toolCalls = [{
              id: 'call_' + Math.random().toString(36).substr(2, 9),
              type: 'function',
              function: {
                  name: functionCall.name,
                  arguments: JSON.stringify(functionCall.args)
              }
          }];
      }

      return {
        content,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        },
        toolCalls
      };
    } catch (error) {
      console.error(`Provider ${this.name} failed:`, error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    return true; 
  }
}

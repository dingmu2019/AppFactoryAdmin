
import type { AIProvider, AIRequest, AIResponse, ProviderConfig } from '../types.ts';

export class GeminiProvider implements AIProvider {
  id: string;
  name: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
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

    // Check if we need to append key to URL (standard Google API behavior) 
    // OR if we should rely on headers. 
    // Standard Google Gemini uses `?key=API_KEY` in URL usually, but `x-goog-api-key` header is also supported.
    // However, 3rd party proxies might strictly require Bearer token or specific headers.
    
    // HEURISTIC:
    // 1. If URL contains 'generativelanguage.googleapis.com', use `?key=` or `x-goog-api-key`.
    // 2. If URL is a 3rd party proxy (like gptsapi.net), they often mimic OpenAI or use Bearer.
    //    BUT the error message says "API key not valid", and details show google.rpc.ErrorInfo from "generativelanguage.googleapis.com".
    //    This implies the proxy is forwarding the request to Google, and Google is rejecting it.
    //    The screenshot shows a full URL: https://api.gptsapi.net/.../models/gemini-3-flash-preview:generateContent
    
    // FIX: Ensure API Key is passed correctly. 
    // If using a proxy, they might expect the key in the Authorization header (Bearer) OR as a query param.
    // Google's error "API key not valid" usually means the key passed to Google (by the proxy) is wrong, OR the proxy didn't pass it.
    // If we are calling a proxy, we should probably pass the key as a Bearer token or in the way the proxy expects.
    // BUT if the proxy just forwards, we might need to append `?key=` to the URL.
    
    // Let's try appending key to URL if it's not present, AND sending headers.
    // If we have a proxy like gptsapi.net, we generally do NOT want to append ?key= to the URL if it uses OpenAI-style auth (Bearer).
    // However, the user's curl example for gptsapi.net SHOWS 'x-goog-api-key' header usage, and NO key in URL.
    // And NO Authorization Bearer header in their curl example.
    
    // The user's curl command:
    // curl -X POST 'https://api.gptsapi.net/...:generateContent' \
    // -H 'x-goog-api-key: ...' ...
    
    // So for this specific proxy, we should:
    // 1. NOT append ?key= (unless it fails without it, but curl worked without it)
    // 2. SEND 'x-goog-api-key' header.
    
    // But wait, my previous fix APPENDED ?key= AND sent headers. 
    // If the proxy forwards blindly, ?key= might be fine.
    // But if the proxy validates the key itself, it might look at headers.
    
    // Let's refine:
    // If the baseUrl is the standard Google one, we append ?key=.
    // If it's a 3rd party, we prioritize headers.
    
    // Actually, the safest bet for Google APIs is ?key= for browser/client usage, but for server-to-server, headers are fine.
    // The previous implementation appended ?key= unconditionally if missing. 
    // Let's revert the unconditional append if it causes issues with some proxies, 
    // OR just keep it if it's harmless.
    // BUT, the user's curl worked WITHOUT ?key= in URL.
    
    // IMPORTANT: The user said "api.gptsapi.net is working, as above".
    // And they used `x-goog-api-key` header.
    // So we MUST ensure `x-goog-api-key` is sent.
    // We are already sending it.
    
    // Why did it fail before?
    // The error was: "API key not valid... domain: googleapis.com".
    // This means the request reached Google, but the key was rejected.
    // Maybe the key wasn't passed correctly by the proxy?
    // Or maybe we were using a different URL format?
    
    // If I append `?key=`, it should work for Google. 
    // Does gptsapi.net strip query params?
    
    // Let's stick to the user's successful curl pattern:
    // URL: clean URL (no key)
    // Headers: x-goog-api-key
    
    // So I will REMOVE the auto-append of ?key= if it's a custom URL, 
    // OR make it optional. 
    // Actually, for `generativelanguage.googleapis.com`, I SHOULD append it if I want to be safe, 
    // but for 3rd party, maybe not.
    
    // Let's try to match the curl exactly:
    // - No ?key= in URL
    // - x-goog-api-key header present
    
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

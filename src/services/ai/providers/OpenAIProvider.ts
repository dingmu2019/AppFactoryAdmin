
import type { AIProvider, AIRequest, AIResponse, ProviderConfig } from '../types';
import { EncryptionService } from '@/services/EncryptionService';

export class OpenAIProvider implements AIProvider {
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
    this.name = `OpenAI-${config.model}`;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const messages = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    messages.push(...request.messages);

    const payload: any = {
      model: this.config.model,
      messages: messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    };

    if (request.tools && request.tools.length > 0) {
        payload.tools = request.tools;
    }

    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as any;
      const choice = data.choices[0];
      
      return {
        content: choice.message.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        toolCalls: choice.message.tool_calls
      };
    } catch (error) {
      console.error(`Provider ${this.name} failed:`, error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple lightweight check - list models or a tiny completion
      // For efficiency, we might just assume healthy unless recent errors occurred (Circuit Breaker logic handles this)
      // Here we can implement a real probe if needed.
      return true; 
    } catch {
      return false;
    }
  }
}

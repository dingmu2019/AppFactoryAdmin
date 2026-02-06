
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
}

export interface AIRequest {
  messages: Array<{ role: string; content: string | ContentPart[] }>;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[]; // Function calling definitions
  complexity?: 'simple' | 'complex'; // Task complexity hint
}

export interface AIResponse {
  content: string;
  provider?: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: any[];
}

export interface ProviderConfig {
  id: string;
  provider: 'openai' | 'google' | 'anthropic' | 'deepseek';
  model: string;
  apiKey: string;
  baseUrl?: string;
  priority: number; // 0 is highest
  isFallback?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  chat(request: AIRequest): Promise<AIResponse>;
  isHealthy(): Promise<boolean>;
}

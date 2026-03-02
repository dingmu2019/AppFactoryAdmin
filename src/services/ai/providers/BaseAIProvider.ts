
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'function';
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
}

export interface AIProviderConfig {
  id: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  projectId?: string;
  apiVersion?: string;
  deploymentId?: string; // Azure
  isPrimary?: boolean;
  priority?: number;
  isFallback?: boolean;
}

export interface AIRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: any[];
  toolChoice?: any;
  stream?: boolean;
  complexity?: string;
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
  finishReason?: string;
}

export interface BaseAIProvider {
  id: string;
  name: string;
  chat(request: AIRequest): Promise<AIResponse>;
  isHealthy(): Promise<boolean>;
}

// Alias for compatibility
export type AIProvider = BaseAIProvider;
export type ProviderConfig = AIProviderConfig;

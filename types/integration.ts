
export type IntegrationCategory = 'llm' | 'email' | 'database' | 'wechat' | 'enterprise';

export interface IntegrationConfig {
  id?: string;
  category: IntegrationCategory;
  provider?: string;
  config: Record<string, any>;
  is_enabled: boolean;
  updated_at?: string;
}

export interface LLMConfig {
  provider: 'openai' | 'azure' | 'google' | 'deepseek' | 'anthropic';
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  apiVersion?: string; // For Azure
  deployment?: string; // For Azure
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderName: string;
  secure: boolean;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'supabase';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface WeChatConfig {
  corpId: string;
  agentId: string;
  secret: string;
}

export interface EnterpriseConfig {
  name: string;
  address: string;
  description: string;
  departments: string;
}

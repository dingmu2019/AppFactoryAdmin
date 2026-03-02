
export type IntegrationCategory =
  | 'llm'
  | 'email'
  | 'database'
  | 'payment'
  | 'notification'
  | 'wechat'
  | 'feishu'
  | 'lark'
  | 'whatsapp'
  | 'enterprise';

export interface IntegrationConfig {
  id?: string;
  category: IntegrationCategory;
  provider?: string;
  config: Record<string, any>;
  is_enabled: boolean;
  updated_at?: string;
}

export interface PaymentConfig {
  provider: 'stripe' | 'wechat_pay' | 'alipay' | 'lakala';
  // Common
  merchantId?: string;
  merchantNo?: string; // Lakala
  termNo?: string; // Lakala
  appId?: string; // For WeChat/Alipay
  publicKey?: string; // Stripe Publishable Key, Lakala Public Key
  secretKey: string; // Stripe Secret or WeChat Key, Lakala Private Key
  webhookSecret?: string;
  certificatePath?: string; // WeChat P12
  sandbox: boolean;
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
  isPrimary?: boolean;
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

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

export interface LarkConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
}

export interface EnterpriseConfig {
  name: string;
  address: string;
  description: string;
  departments: string;
}

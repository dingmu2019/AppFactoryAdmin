export type ChannelType = 'email' | 'sms' | 'im' | 'whatsapp';

export type ProviderType = 'smtp' | 'webhook';

export type MessageStatus = 'pending' | 'processing' | 'sent' | 'failed';

export type NotificationMessageType =
  | 'login_verification'
  | 'test'
  | 'generic';

export type NotificationChannelRow = {
  id: string;
  channel_type: ChannelType;
  name: string;
  is_enabled: boolean;
};

export type NotificationProviderRow = {
  id: string;
  channel_id: string;
  provider_type: ProviderType;
  name: string;
  config: any;
  is_enabled: boolean;
};

export type NotificationRouteRow = {
  id: string;
  channel_id: string;
  message_type: string;
  provider_id: string;
  fallback_provider_id: string | null;
  priority: number;
  is_enabled: boolean;
};

export type NotificationTemplateRow = {
  id: string;
  channel_id: string;
  message_type: string;
  language: string;
  subject: string | null;
  body: string;
  format: 'text' | 'html' | 'json';
  is_enabled: boolean;
};

export type NotificationMessageRow = {
  id: string;
  channel_id: string;
  message_type: string;
  recipient: string;
  payload: any;
  status: MessageStatus;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ProviderSendInput = {
  to: string;
  subject?: string;
  body: string;
  format: 'text' | 'html' | 'json';
  payload: any;
};

export type ProviderSendResult = {
  success: boolean;
  response?: any;
  errorMessage?: string;
};


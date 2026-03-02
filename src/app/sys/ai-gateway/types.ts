
export type SaaSAppLite = {
  id: string;
  name: string;
  config: any;
  status?: string;
};

export type ModelOption = {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  model?: string;
  baseUrl?: string;
};

export type GatewayPolicy = {
  id: string;
  app_id: string;
  name: string;
  type: 'rate_limit' | 'quota' | 'security' | 'routing';
  config: any;
  is_enabled: boolean;
  default_model: string | null;
  allowed_models: string[] | null;
  allow_tools: boolean;
  allow_content_logging: boolean;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
  daily_token_limit: number | null;
  daily_request_limit: number | null;
  enforce_billing?: boolean;
  credits_per_usd?: number;
  credits_per_1k_tokens?: number;
  daily_credit_limit?: number | null;
};

export type UsageToday = {
  total_requests: number;
  request_count: number;
  total_tokens: number;
  error_rate: number;
  avg_latency: number;
  daily_token_limit: number | null;
  daily_request_limit: number | null;
};

export type RequestLog = {
  id: string;
  created_at: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  app_id: string;
  model?: string;
  tokens?: number;
  error?: string;
  request_body?: any;
  response_body?: any;
  ip_address?: string;
  provider?: string;
  total_tokens?: number;
  error_message?: string;
  endpoint?: string;
  request_id?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
};

export type TrendPoint = {
  time: string;
  requests: number;
  latency: number;
  day: string;
  total_tokens: number;
  request_count: number;
  error_rate: number;
  p95_latency_ms: number;
};

export type AlertRule = {
  id: string;
  name: string;
  metric: 'error_rate' | 'latency' | 'token_usage';
  threshold: number;
  window: string;
  is_enabled: boolean;
  token_usage_threshold: number;
  request_usage_threshold: number;
  error_rate_threshold: number;
  p95_latency_threshold_ms: number;
  window_minutes: number;
  cooldown_minutes: number;
  recipients: string[];
  updated_at?: string | null;
  recipients_text?: string;
};

export type AlertPreview = {
  id: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  breaches: {
    token: boolean;
    request: boolean;
    error_rate: boolean;
    p95_latency: boolean;
  };
  ratios: {
    tokenRatio: number | null;
    requestRatio: number | null;
  };
  window: {
    error_rate: number;
    p95_latency_ms: number;
  };
};

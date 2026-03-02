
import { supabase } from '../../lib/supabase';

export type PolicyRow = {
  default_model: string | null;
  allowed_models: string[] | null;
  allow_tools: boolean;
  allow_content_logging: boolean;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
  daily_token_limit?: number | null;
  daily_request_limit?: number | null;
  enforce_billing?: boolean | null;
  credits_per_usd?: number | null;
  credits_per_1k_tokens?: number | null;
  daily_credit_limit?: number | null;
};

export const getPolicy = async (appId: string) => {
  const { data, error } = await supabase
    .from('ai_gateway_policies')
    .select('default_model, allowed_models, allow_tools, allow_content_logging, max_input_tokens, max_output_tokens, daily_token_limit, daily_request_limit, enforce_billing, credits_per_usd, credits_per_1k_tokens, daily_credit_limit')
    .eq('app_id', appId)
    .maybeSingle();

  if (error) return null;
  return (data as PolicyRow | null) ?? null;
};

export const coerceString = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

export const estimateTokens = (input: string) => Math.max(1, Math.ceil(input.length / 4));

export const estimateRequestTokens = (body: any) => {
  const msgStr = JSON.stringify(body?.messages || []);
  const modelStr = typeof body?.model === 'string' ? body.model : '';
  const sysStr = '';
  return estimateTokens(msgStr + modelStr + sysStr);
};

export type PricingRow = { provider: string; model: string; input_usd_per_1m: number; output_usd_per_1m: number };

const pricingCache = new Map<string, { row: PricingRow; at: number }>();

export const getPricing = async (provider: string | null | undefined, model: string) => {
  const key = `${provider || ''}::${model}`;
  const now = Date.now();
  const cached = pricingCache.get(key);
  if (cached && now - cached.at < 5 * 60 * 1000) return cached.row;

  const q = supabase
    .from('ai_model_pricing')
    .select('provider,model,input_usd_per_1m,output_usd_per_1m')
    .eq('model', model)
    .eq('is_active', true);

  const { data, error } = provider ? await q.eq('provider', provider).limit(1) : await q.limit(1);
  if (error || !data || data.length === 0) {
    if (provider) {
      const { data: fallback } = await supabase
        .from('ai_model_pricing')
        .select('provider,model,input_usd_per_1m,output_usd_per_1m')
        .eq('model', model)
        .eq('is_active', true)
        .limit(1);
      if (fallback && fallback[0]) {
        const row = fallback[0] as any;
        const parsed = {
          provider: String(row.provider),
          model: String(row.model),
          input_usd_per_1m: Number(row.input_usd_per_1m || 0),
          output_usd_per_1m: Number(row.output_usd_per_1m || 0)
        };
        pricingCache.set(key, { row: parsed, at: now });
        return parsed;
      }
    }
    return null;
  }

  const row = data[0] as any;
  const parsed = {
    provider: String(row.provider),
    model: String(row.model),
    input_usd_per_1m: Number(row.input_usd_per_1m || 0),
    output_usd_per_1m: Number(row.output_usd_per_1m || 0)
  };
  pricingCache.set(key, { row: parsed, at: now });
  return parsed;
};

export const computeCostUsd = (pricing: PricingRow | null, promptTokens: number, completionTokens: number) => {
  if (!pricing) return 0;
  const inUsd = (Math.max(0, promptTokens) / 1_000_000) * Math.max(0, pricing.input_usd_per_1m);
  const outUsd = (Math.max(0, completionTokens) / 1_000_000) * Math.max(0, pricing.output_usd_per_1m);
  return Number((inUsd + outUsd).toFixed(6));
};

export const computeCredits = (params: {
  policy: PolicyRow | null;
  pricing: PricingRow | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}) => {
  const ratePer1k = Number(params.policy?.credits_per_1k_tokens || 0);
  if (Number.isFinite(ratePer1k) && ratePer1k > 0) {
    return Math.ceil((Math.max(0, params.totalTokens) * ratePer1k) / 1000);
  }
  const creditsPerUsd = Number(params.policy?.credits_per_usd || 0);
  if (Number.isFinite(creditsPerUsd) && creditsPerUsd > 0) {
    const costUsd = computeCostUsd(params.pricing, params.promptTokens, params.completionTokens);
    if (costUsd > 0) return Math.ceil(costUsd * creditsPerUsd);
  }
  return Math.max(0, params.totalTokens);
};

export const splitSystemPrompt = (messages: any[]) => {
  const systemParts: string[] = [];
  const rest: any[] = [];

  for (const m of Array.isArray(messages) ? messages : []) {
    if (m?.role === 'system') {
      if (typeof m.content === 'string') systemParts.push(m.content);
      else systemParts.push(coerceString(m.content));
    } else {
      rest.push(m);
    }
  }

  const systemPrompt = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
  return { systemPrompt, messages: rest };
};

export const isModelAllowed = (requested: string | undefined, policy: PolicyRow | null) => {
  const allowList = Array.isArray(policy?.allowed_models) ? policy!.allowed_models : [];
  if (allowList.length === 0) return true;
  if (!requested) return true;
  return allowList.includes(requested);
};

export const chooseModel = (requested: string | undefined, policy: PolicyRow | null) => {
  const allowList = Array.isArray(policy?.allowed_models) ? policy!.allowed_models : [];
  if (requested) return requested;
  if (policy?.default_model) return policy.default_model;
  if (allowList.length > 0) return allowList[0];
  return undefined;
};

export const getUsageToday = async (appId: string) => {
  try {
    const { data, error } = await supabase.rpc('ai_gateway_usage_today', { p_app_id: appId });
    if (error) return { totalTokens: 0, requestCount: 0 };
    const row = Array.isArray(data) ? data[0] : data;
    return {
      totalTokens: Number(row?.total_tokens || 0),
      requestCount: Number(row?.request_count || 0)
    };
  } catch {
    return { totalTokens: 0, requestCount: 0 };
  }
};

export const enforceQuota = async (appId: string, policy: PolicyRow | null, reqBody: any) => {
  if (!policy) return null;
  const dailyTokenLimit = typeof policy.daily_token_limit === 'number' ? policy.daily_token_limit : null;
  const dailyRequestLimit = typeof policy.daily_request_limit === 'number' ? policy.daily_request_limit : null;
  if (!dailyTokenLimit && !dailyRequestLimit) return null;

  const usage = await getUsageToday(appId);

  if (dailyRequestLimit && usage.requestCount >= dailyRequestLimit) {
    return {
      status: 429,
      error: 'Daily request quota exceeded',
      limit: dailyRequestLimit,
      used: usage.requestCount
    };
  }

  if (dailyTokenLimit) {
    const requestedMax = typeof reqBody?.max_tokens === 'number' ? reqBody.max_tokens : undefined;
    const maxOut = requestedMax ?? (policy.max_output_tokens ?? 1024);
    const estimatedIn = estimateRequestTokens(reqBody);
    const estimatedTotal = estimatedIn + Math.max(0, Number(maxOut || 0));
    if (usage.totalTokens + estimatedTotal > dailyTokenLimit) {
      return {
        status: 429,
        error: 'Daily token quota exceeded',
        limit: dailyTokenLimit,
        used: usage.totalTokens
      };
    }
  }

  return null;
};

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { ModelRouter } from '../../services/ai/ModelRouter.ts';
import type { AIRequest } from '../../services/ai/types.ts';
import { loadLLMConfigsIntoRouter } from '../../services/ai/loadLLMConfigs.ts';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type PolicyRow = {
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

const getPolicy = async (appId: string) => {
  const { data, error } = await supabase
    .from('ai_gateway_policies')
    .select('default_model, allowed_models, allow_tools, allow_content_logging, max_input_tokens, max_output_tokens, daily_token_limit, daily_request_limit, enforce_billing, credits_per_usd, credits_per_1k_tokens, daily_credit_limit')
    .eq('app_id', appId)
    .maybeSingle();

  if (error) return null;
  return (data as PolicyRow | null) ?? null;
};

const coerceString = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

const estimateTokens = (input: string) => Math.max(1, Math.ceil(input.length / 4));

const estimateRequestTokens = (body: any) => {
  const msgStr = JSON.stringify(body?.messages || []);
  const modelStr = typeof body?.model === 'string' ? body.model : '';
  const sysStr = '';
  return estimateTokens(msgStr + modelStr + sysStr);
};

type PricingRow = { provider: string; model: string; input_usd_per_1m: number; output_usd_per_1m: number };

const pricingCache = new Map<string, { row: PricingRow; at: number }>();

const getPricing = async (provider: string | null | undefined, model: string) => {
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

const computeCostUsd = (pricing: PricingRow | null, promptTokens: number, completionTokens: number) => {
  if (!pricing) return 0;
  const inUsd = (Math.max(0, promptTokens) / 1_000_000) * Math.max(0, pricing.input_usd_per_1m);
  const outUsd = (Math.max(0, completionTokens) / 1_000_000) * Math.max(0, pricing.output_usd_per_1m);
  return Number((inUsd + outUsd).toFixed(6));
};

const computeCredits = (params: {
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

const splitSystemPrompt = (messages: any[]) => {
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

const isModelAllowed = (requested: string | undefined, policy: PolicyRow | null) => {
  const allowList = Array.isArray(policy?.allowed_models) ? policy!.allowed_models : [];
  if (allowList.length === 0) return true;
  if (!requested) return true;
  return allowList.includes(requested);
};

const chooseModel = (requested: string | undefined, policy: PolicyRow | null) => {
  const allowList = Array.isArray(policy?.allowed_models) ? policy!.allowed_models : [];
  if (requested) return requested;
  if (policy?.default_model) return policy.default_model;
  if (allowList.length > 0) return allowList[0];
  return undefined;
};

const getUsageToday = async (appId: string) => {
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

const enforceQuota = async (appId: string, policy: PolicyRow | null, reqBody: any) => {
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

import { MeteringService } from '../../services/MeteringService.ts';

// ... (existing imports)

// In writeGatewayLog or finalize logic:
const finalizeUsage = async (appId: string, requestId: string, metrics: any) => {
    // Record AI Tokens for metering
    if (metrics.totalTokens > 0) {
        MeteringService.recordUsage(appId, 'ai_token_input', metrics.promptTokens, { model: metrics.model, requestId });
        MeteringService.recordUsage(appId, 'ai_token_output', metrics.completionTokens, { model: metrics.model, requestId });
    }
};

// ... inside handlers where we have usage ...
// For now, let's inject into writeGatewayLog since it's called on completion
const writeGatewayLog = async (payload: {
  requestId: string;
  appId: string;
  endpoint: string;
  provider?: string | null;
  model?: string | null;
  statusCode: number;
  latencyMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  errorMessage?: string | null;
}) => {
  try {
    await supabase.from('ai_gateway_requests').insert({
      request_id: payload.requestId,
      app_id: payload.appId,
      endpoint: payload.endpoint,
      provider: payload.provider ?? null,
      model: payload.model ?? null,
      status_code: payload.statusCode,
      latency_ms: payload.latencyMs ?? null,
      prompt_tokens: payload.promptTokens ?? 0,
      completion_tokens: payload.completionTokens ?? 0,
      total_tokens: payload.totalTokens ?? 0,
      error_message: payload.errorMessage ?? null
    });

    // New Metering Logic
    if (payload.statusCode === 200) {
        MeteringService.recordUsage(payload.appId, 'ai_token_input', payload.promptTokens || 0, { model: payload.model });
        MeteringService.recordUsage(payload.appId, 'ai_token_output', payload.completionTokens || 0, { model: payload.model });
    }

  } catch {
  }
};

const streamOpenAICompatible = async (params: {
  requestId: string;
  res: express.Response;
  providerType: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  body: any;
}) => {
  const { requestId, res, baseUrl, apiKey, model, body } = params;

  const payload: any = {
    ...body,
    model,
    stream: true,
    stream_options: { include_usage: true }
  };

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upstream stream error (${response.status}): ${text}`);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('x-request-id', requestId);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let lastUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    res.write(chunk);

    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;
      try {
        const obj = JSON.parse(dataStr);
        if (obj?.usage) {
          lastUsage = {
            promptTokens: obj.usage.prompt_tokens || 0,
            completionTokens: obj.usage.completion_tokens || 0,
            totalTokens: obj.usage.total_tokens || 0
          };
        }
      } catch {
      }
    }
  }

  res.end();
  return lastUsage;
};

const streamGeminiAsOpenAI = async (params: {
  requestId: string;
  res: express.Response;
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: any[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}) => {
  const { requestId, res, apiKey, model } = params;
  let cleanBaseUrl = params.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  if (cleanBaseUrl.endsWith('/')) cleanBaseUrl = cleanBaseUrl.slice(0, -1);

  const url = cleanBaseUrl.includes('/models/')
    ? cleanBaseUrl.replace(':generateContent', ':streamGenerateContent')
    : `${cleanBaseUrl}/models/${model}:streamGenerateContent`;

  const contents = (Array.isArray(params.messages) ? params.messages : []).map((m: any) => ({
    role: m?.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m?.content === 'string' ? m.content : coerceString(m?.content) }]
  }));

  const payload: any = {
    contents,
    generationConfig: {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxTokens
    }
  };

  if (params.systemPrompt) {
    payload.systemInstruction = { parts: [{ text: params.systemPrompt }] };
  }

  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}alt=sse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upstream stream error (${response.status}): ${text}`);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('x-request-id', requestId);

  const chunkId = `chatcmpl_${requestId}`;
  const created = Math.floor(Date.now() / 1000);
  const write = (obj: any) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  write({
    id: chunkId,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const lines = part.split('\n').map(l => l.trim());
      const dataLine = lines.find(l => l.startsWith('data:'));
      if (!dataLine) continue;
      const dataStr = dataLine.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;

      try {
        const obj = JSON.parse(dataStr);
        const text = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === 'string' && text.length > 0) {
          const delta = text.startsWith(accumulated) ? text.slice(accumulated.length) : text;
          accumulated = text;
          if (!delta) continue;
          write({
            id: chunkId,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{ index: 0, delta: { content: delta }, finish_reason: null }]
          });
        }
      } catch {
      }
    }
  }

  write({
    id: chunkId,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
  });
  res.write('data: [DONE]\n\n');
  res.end();
};

/**
 * @openapi
 * /api/v1/ai/models:
 *   get:
 *     tags: [AI]
 *     summary: List available AI models
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of models
 */
router.get('/models', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('id, config')
      .eq('category', 'llm')
      .eq('is_enabled', true)
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (error) return res.status(500).json({ error: error.message });

    const models = (data || [])
      .map((row: any) => ({
        id: row.id,
        provider: row.config?.provider || 'openai',
        model: row.config?.model,
        baseUrl: row.config?.baseUrl || row.config?.endpoint || row.config?.url
      }))
      .filter((m: any) => Boolean(m.model));

    res.json({ data: models });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/ai/chat/completions:
 *   post:
 *     tags: [AI]
 *     summary: Chat completion
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               model:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *               temperature:
 *                 type: number
 *               max_tokens:
 *                 type: integer
 *               stream:
 *                 type: boolean
 *               tools:
 *                 type: array
 *     responses:
 *       200:
 *         description: AI response
 */
router.post('/chat/completions', async (req, res) => {
  const requestId = crypto.randomUUID().replace(/-/g, '');
  const start = Date.now();
  const appId = req.currentApp?.id;
  let didReserve = false;

  if (!appId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const policy = await getPolicy(appId);

    const rawMessages = req.body?.messages;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const requestedModel = typeof req.body?.model === 'string' ? req.body.model : undefined;
    const model = chooseModel(requestedModel, policy);

    if (!model) {
      return res.status(400).json({ error: 'No model specified and no default model configured' });
    }

    if (!isModelAllowed(model, policy)) {
      return res.status(403).json({ error: `Model not allowed: ${model}` });
    }

    const { systemPrompt, messages } = splitSystemPrompt(rawMessages);
    const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : undefined;
    const maxTokens = typeof req.body?.max_tokens === 'number' ? req.body.max_tokens : undefined;
    const tools = Array.isArray(req.body?.tools) ? req.body.tools : undefined;
    const stream = Boolean(req.body?.stream);

    const requestedMax = typeof req.body?.max_tokens === 'number' ? req.body.max_tokens : undefined;
    const maxOut = requestedMax ?? (policy?.max_output_tokens ?? 1024);
    const estimatedIn = Math.ceil(estimateRequestTokens(req.body) * 1.5) + 32;
    const estimatedTokens = estimatedIn + Math.max(0, Number(maxOut || 0));

    const gatewayRequest: AIRequest = {
      model,
      systemPrompt,
      messages,
      temperature,
      maxTokens: maxTokens ?? (policy?.max_output_tokens ?? undefined),
      tools: policy?.allow_tools ? tools : undefined,
      complexity: req.body?.complexity === 'complex' ? 'complex' : 'simple'
    };

    const endpoint = '/api/v1/ai/chat/completions';
    const enforceBilling = Boolean(policy?.enforce_billing);
    let reservedProvider: string | null = null;
    let estimatedCredits = 0;
    if (enforceBilling) {
      const pricing = await getPricing(null, model);
      estimatedCredits = computeCredits({
        policy,
        pricing,
        promptTokens: estimatedIn,
        completionTokens: Math.max(0, Number(maxOut || 0)),
        totalTokens: estimatedTokens
      });
    }

    let reserveUnsupported = false;
    try {
      const { data: reserveRow, error: reserveErr } = await supabase.rpc('ai_gateway_check_and_reserve', {
        p_app_id: appId,
        p_request_id: requestId,
        p_estimated_tokens: estimatedTokens,
        p_estimated_credits: estimatedCredits,
        p_user_id: null,
        p_endpoint: endpoint,
        p_provider: reservedProvider,
        p_model: model
      });

      const reserve = Array.isArray(reserveRow) ? reserveRow[0] : reserveRow;
      if (reserveErr || reserve?.ok === false) {
        res.setHeader('x-request-id', requestId);
        const code = reserve?.error_code || 'LIMIT';
        const message = reserve?.message || reserveErr?.message || 'Rejected';
        const status =
          code === 'INSUFFICIENT_CREDITS' || code === 'INSUFFICIENT_CREDITS_AT_FINALIZE' ? 402 : 429;
        await writeGatewayLog({
          requestId,
          appId,
          endpoint,
          statusCode: status,
          latencyMs: Date.now() - start,
          errorMessage: message
        });
        return res.status(status).json({ error: message, code, request_id: requestId });
      }
      didReserve = true;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('ai_gateway_check_and_reserve') || msg.includes('function') || msg.includes('schema cache')) {
        reserveUnsupported = true;
      } else {
        throw e;
      }
    }

    if (reserveUnsupported) {
      const quotaError = await enforceQuota(appId, policy, req.body);
      if (quotaError) {
        res.setHeader('x-request-id', requestId);
        return res.status(429).json({ error: quotaError.error, limit: quotaError.limit, used: quotaError.used, request_id: requestId });
      }
    }

    if (stream) {
      const { data: configs, error: cfgErr } = await supabase
        .from('integration_configs')
        .select('id, config')
        .eq('category', 'llm')
        .eq('is_enabled', true)
        .or('is_deleted.is.null,is_deleted.eq.false'); // Filter out soft-deleted records

      if (cfgErr || !configs || configs.length === 0) return res.status(404).json({ error: 'LLM configuration missing or disabled' });

      const ordered = configs
        .flatMap((row: any) => {
          // Support new multi-model structure
          if (row.config?.models && Array.isArray(row.config.models)) {
              return row.config.models.map((m: any, subIndex: number) => {
                  if (m.enabled === false) return null;
                  let providerType = m.provider || 'openai';
                  if (providerType === 'DeepSeek') providerType = 'deepseek';
                  return {
                      id: m._id || `${row.id}-${subIndex}`,
                      provider: providerType,
                      model: m.model,
                      apiKey: m.apiKey,
                      baseUrl: m.baseUrl || m.endpoint || m.url
                  };
              }).filter(Boolean);
          }

          // Legacy single model structure
          const c = row.config || {};
          let providerType = c.provider || 'openai';
          if (providerType === 'DeepSeek') providerType = 'deepseek';
          return [{
            id: row.id,
            provider: providerType,
            model: c.model,
            apiKey: c.apiKey,
            baseUrl: c.baseUrl || c.endpoint || c.url
          }];
        })
        .filter((c: any) => Boolean(c.apiKey) && Boolean(c.model))
        .sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));

      const selected = ordered.find((c: any) => c.model === model) || ordered[0];
      if (!selected) return res.status(404).json({ error: 'No enabled LLM provider found' });
      reservedProvider = selected.provider;

      const body = {
        messages: rawMessages,
        temperature,
        max_tokens: maxTokens ?? (policy?.max_output_tokens ?? undefined),
        tools: policy?.allow_tools ? tools : undefined
      };

      let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;
      if (selected.provider === 'google') {
        if (body.tools) {
          return res.status(400).json({ error: 'Streaming with tools is not supported for google provider in gateway' });
        }
        const { systemPrompt, messages } = splitSystemPrompt(rawMessages);
        await streamGeminiAsOpenAI({
          requestId,
          res,
          baseUrl: selected.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
          apiKey: selected.apiKey,
          model,
          messages,
          systemPrompt,
          temperature,
          maxTokens: maxTokens ?? (policy?.max_output_tokens ?? undefined)
        });
      } else {
        usage = await streamOpenAICompatible({
          requestId,
          res,
          providerType: selected.provider,
          baseUrl: selected.baseUrl || 'https://api.openai.com/v1',
          apiKey: selected.apiKey,
          model,
          body
        });
      }

      const latencyMs = Date.now() - start;
      const promptTokens = usage?.promptTokens ?? estimatedIn;
      const completionTokens = usage?.completionTokens ?? Math.max(0, Number(maxOut || 0));
      const totalTokens = usage?.totalTokens ?? (promptTokens + completionTokens);

      await writeGatewayLog({
        requestId,
        appId,
        endpoint,
        provider: selected.provider,
        model,
        statusCode: 200,
        latencyMs,
        promptTokens,
        completionTokens,
        totalTokens
      });
      const pricing = await getPricing(selected.provider, model);
      const costUsd = computeCostUsd(pricing, promptTokens, completionTokens);
      const credits = enforceBilling
        ? computeCredits({ policy, pricing, promptTokens, completionTokens, totalTokens })
        : 0;

      if (didReserve) {
        try {
          await supabase.rpc('ai_gateway_finalize', {
            p_app_id: appId,
            p_request_id: requestId,
            p_prompt_tokens: promptTokens,
            p_completion_tokens: completionTokens,
            p_total_tokens: totalTokens,
            p_status_code: 200,
            p_error_message: null,
            p_provider: selected.provider,
            p_model: model,
            p_cost_usd: costUsd,
            p_credits_charged: credits
          });
        } catch {}
      }
      return;
    }

    const routerInstance = new ModelRouter();
    const hasConfigs = await loadLLMConfigsIntoRouter(routerInstance, supabase);
    if (!hasConfigs) return res.status(404).json({ error: 'LLM configuration missing or disabled' });

    const aiResp = await routerInstance.routeRequest(gatewayRequest);
    const latencyMs = Date.now() - start;

    await writeGatewayLog({
      requestId,
      appId,
      endpoint,
      provider: aiResp.provider || null,
      model: aiResp.model || model,
      statusCode: 200,
      latencyMs,
      promptTokens: aiResp.usage?.promptTokens ?? 0,
      completionTokens: aiResp.usage?.completionTokens ?? 0,
      totalTokens: aiResp.usage?.totalTokens ?? 0
    });

    const promptTokens = aiResp.usage?.promptTokens ?? estimatedIn;
    const completionTokens = aiResp.usage?.completionTokens ?? 0;
    const totalTokens = aiResp.usage?.totalTokens ?? (promptTokens + completionTokens);
    const pricing = await getPricing(aiResp.provider || null, aiResp.model || model);
    const costUsd = computeCostUsd(pricing, promptTokens, completionTokens);
    const credits = enforceBilling
      ? computeCredits({ policy, pricing, promptTokens, completionTokens, totalTokens })
      : 0;

    if (didReserve) {
      try {
        await supabase.rpc('ai_gateway_finalize', {
          p_app_id: appId,
          p_request_id: requestId,
          p_prompt_tokens: promptTokens,
          p_completion_tokens: completionTokens,
          p_total_tokens: totalTokens,
          p_status_code: 200,
          p_error_message: null,
          p_provider: aiResp.provider || null,
          p_model: aiResp.model || model,
          p_cost_usd: costUsd,
          p_credits_charged: credits
        });
      } catch {}
    }

    const responseBody: any = {
      id: `chatcmpl_${requestId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: aiResp.model || model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: aiResp.content || '',
            tool_calls: aiResp.toolCalls
          },
          finish_reason: aiResp.toolCalls ? 'tool_calls' : 'stop'
        }
      ],
      usage: {
        prompt_tokens: aiResp.usage?.promptTokens ?? 0,
        completion_tokens: aiResp.usage?.completionTokens ?? 0,
        total_tokens: aiResp.usage?.totalTokens ?? 0
      }
    };

    res.setHeader('x-request-id', requestId);
    return res.json(responseBody);
  } catch (e: any) {
    const latencyMs = Date.now() - start;
    const endpoint = '/api/v1/ai/chat/completions';
    await writeGatewayLog({
      requestId,
      appId,
      endpoint,
      statusCode: 500,
      latencyMs,
      errorMessage: e?.message || String(e)
    });
    try {
      if (typeof didReserve === 'boolean' && didReserve) {
        await supabase.rpc('ai_gateway_finalize', {
          p_app_id: appId,
          p_request_id: requestId,
          p_prompt_tokens: 0,
          p_completion_tokens: 0,
          p_total_tokens: 0,
          p_status_code: 500,
          p_error_message: e?.message || String(e),
          p_provider: null,
          p_model: null,
          p_cost_usd: 0,
          p_credits_charged: 0
        });
      }
    } catch {}
    res.setHeader('x-request-id', requestId);
    return res.status(500).json({ error: e.message || String(e), request_id: requestId });
  }
});

export default router;

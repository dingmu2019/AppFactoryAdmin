
// import express from 'express';
import { coerceString } from './GatewayUtils';

export const streamOpenAICompatible = async (params: {
  requestId: string;
  res: any;
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

export const streamGeminiAsOpenAI = async (params: {
  requestId: string;
  res: any;
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

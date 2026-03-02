
import { NextRequest, NextResponse } from 'next/server';
import { modelRouter } from '@/services/ai/ModelRouter';
import { loadLLMConfigsIntoRouter } from '@/services/ai/loadLLMConfigs';
import { supabaseAdmin } from '@/lib/supabase';
import type { AIRequest } from '@/services/ai/types';

let lastInitAtMs = 0;
let initPromise: Promise<boolean> | null = null;

async function ensureProvidersLoaded() {
  const now = Date.now();
  if (initPromise) return initPromise;
  if (lastInitAtMs && now - lastInitAtMs < 60_000) return true;

  initPromise = loadLLMConfigsIntoRouter(modelRouter as any, supabaseAdmin as any)
    .then((ok) => {
      lastInitAtMs = Date.now();
      return ok;
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, systemPrompt, agentId, complexity } = body;

    const ok = await ensureProvidersLoaded();
    if (!ok) {
      const { data } = await supabaseAdmin
        .from('integration_configs')
        .select('config')
        .eq('category', 'llm')
        .eq('is_enabled', true)
        .limit(1)
        .maybeSingle();

      const models = (data as any)?.config?.models;
      const encryptedKeyExists =
        Array.isArray(models) && models.some((m: any) => typeof m?.apiKey === 'string' && m.apiKey.includes(':'));

      return NextResponse.json(
        {
          error: encryptedKeyExists
            ? 'LLM config exists but API key is encrypted and cannot be decrypted. Check ENCRYPTION_KEY or re-enter the key in Integration Center.'
            : 'No enabled AI providers found. Please enable an LLM provider in Integration Center, or set OPENAI_API_KEY / GEMINI_API_KEY.'
        },
        { status: 500 }
      );
    }

    const aiRequest: AIRequest = {
        messages,
        systemPrompt,
        complexity: complexity || 'simple',
        // tools: ...
    };

    const response = await modelRouter.routeRequest(aiRequest);

    return NextResponse.json({ content: response.content });
  } catch (error: any) {
    console.error('[API] Internal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

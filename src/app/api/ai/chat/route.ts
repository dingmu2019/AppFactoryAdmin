
import { NextRequest, NextResponse } from 'next/server';
import { modelRouter } from '@/services/ai/ModelRouter';
import { loadLLMConfigsIntoRouter } from '@/services/ai/loadLLMConfigs';
import { supabaseAdmin } from '@/lib/supabase';
import type { AIRequest } from '@/services/ai/types';
import { withApiErrorHandling } from '@/lib/api-wrapper';

let lastInitAtMs = 0;
let initPromise: Promise<boolean> | null = null;

async function ensureProvidersLoaded() {
  const now = Date.now();
  
  // If already initialized and not expired (60s cache), return true
  if (lastInitAtMs && now - lastInitAtMs < 60_000 && modelRouter.getRegisteredConfigs().length > 0) {
    return true;
  }

  // If initialization is already in progress, wait for it
  if (initPromise) {
    console.log('[AI Chat] Waiting for existing initialization to complete...');
    return initPromise;
  }

  console.log('[AI Chat] Initializing AI providers...');
  initPromise = loadLLMConfigsIntoRouter(modelRouter as any, supabaseAdmin as any)
    .then((ok) => {
      lastInitAtMs = Date.now();
      console.log(`[AI Chat] Providers initialized: ${ok}`);
      return ok;
    })
    .catch(err => {
      console.error('[AI Chat] Provider initialization failed:', err);
      return false;
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

export const POST = withApiErrorHandling(async (req: NextRequest) => {
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
    } as any; // Cast to avoid strict type check for now

    const response = await (modelRouter as any).routeRequest(aiRequest);

    return NextResponse.json({ content: response.content });
});

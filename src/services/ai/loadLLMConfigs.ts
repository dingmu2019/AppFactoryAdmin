
import type { SupabaseClient } from '@supabase/supabase-js';
import { ModelRouter } from './ModelRouter';

export async function loadLLMConfigsIntoRouter(modelRouter: ModelRouter, supabase: SupabaseClient) {
  const { data: configsData, error: configError } = await supabase
    .from('integration_configs')
    .select('id, category, config')
    .eq('category', 'llm')
    .eq('is_enabled', true);

  if (configError || !configsData || configsData.length === 0) {
    if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
      const fallbackProvider = process.env.OPENAI_API_KEY ? 'openai' : 'google';
      const fallbackKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
      const fallbackModel = fallbackProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro';

      modelRouter.clearProviders();
      modelRouter.registerProvider({
        id: 'env-fallback',
        provider: fallbackProvider as any,
        model: fallbackModel,
        apiKey: fallbackKey!,
        priority: 0,
        isFallback: true
      });
      return true;
    }
    return false;
  }

  modelRouter.clearProviders();

  if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
    const fallbackProvider = process.env.OPENAI_API_KEY ? 'openai' : 'google';
    const fallbackKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    const fallbackModel = fallbackProvider === 'openai' ? 'gpt-4o' : 'gemini-1.5-flash';

    modelRouter.registerProvider({
      id: 'env-override',
      provider: fallbackProvider as any,
      model: fallbackModel,
      apiKey: fallbackKey!,
      priority: -1,
      isFallback: true
    });
  }

  configsData.forEach((row: any, index: number) => {
    // Check if config has 'models' array (New Schema)
    try {
        if (row.config?.models && Array.isArray(row.config.models)) {
            row.config.models.forEach((m: any, subIndex: number) => {
                if (m.enabled === false) return; // Skip disabled models
                
                let providerType = m.provider || 'openai';
                if (providerType === 'DeepSeek') providerType = 'deepseek';
                if (providerType === 'google') providerType = 'google';

                try {
                    modelRouter.registerProvider({
                        id: m._id || `${row.id}-${subIndex}`,
                        provider: providerType,
                        model: m.model,
                        apiKey: m.apiKey,
                        baseUrl: m.baseUrl || m.endpoint || m.url,
                        priority: index * 100 + subIndex,
                        isFallback: false
                    });
                } catch (e: any) {
                    console.error(`[loadLLMConfigs] Failed to register provider ${m.model}:`, e.message);
                }
            });
        } else {
            // Legacy Single Model
            const c = row.config;
            let providerType = c.provider || 'openai';
            if (providerType === 'DeepSeek') providerType = 'deepseek';
            if (providerType === 'google') providerType = 'google';

            try {
                modelRouter.registerProvider({
                    id: row.id,
                    provider: providerType,
                    model: c.model,
                    apiKey: c.apiKey,
                    baseUrl: c.baseUrl || c.endpoint || c.url,
                    priority: index,
                    isFallback: index > 0
                });
            } catch (e: any) {
                console.error(`[loadLLMConfigs] Failed to register legacy provider ${c.model}:`, e.message);
            }
        }
    } catch (err: any) {
        console.error(`[loadLLMConfigs] Error processing row ${row.id}:`, err.message);
    }
  });

  const registeredCount = modelRouter.getRegisteredConfigs().length;
  console.log(`[loadLLMConfigs] Registered ${registeredCount} providers`);
  return registeredCount > 0;
}

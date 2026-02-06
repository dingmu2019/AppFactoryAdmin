import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { EmailService } from '../services/emailService.ts';
import { OpenAIProvider } from '../services/ai/providers/OpenAIProvider.ts';
import { GeminiProvider } from '../services/ai/providers/GeminiProvider.ts';
import type { ProviderConfig } from '../services/ai/types.ts';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const getIntegrationConfigs = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .or('is_deleted.is.null,is_deleted.eq.false'); // Filter out soft-deleted records

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveIntegrationConfig = async (req: Request, res: Response) => {
  const { id, category, config, is_enabled } = req.body;

  try {
    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: 'category is required' });
      return;
    }

    const payload = {
      category,
      config,
      is_enabled,
      updated_at: new Date().toISOString(),
      is_deleted: false // Ensure resurrected if previously deleted
    };

    if (id && typeof id === 'string') {
      // Explicit Update
      const { data, error } = await supabase
        .from('integration_configs')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: 'Integration config not found' });
        return;
      }
      res.json(data);
      return;
    }

    // For LLM, we allow multiple rows, so we just Insert new one.
    // For others (email, database, etc.), we enforce Singleton via logic.
    if (category === 'llm') {
         const { data, error } = await supabase.from('integration_configs').insert(payload).select().single();
         if (error) throw error;
         res.json(data);
         return;
    }

    // Singleton Logic for non-LLM categories
    const { data: existing, error: findError } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('category', category)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .limit(1)
      .maybeSingle();
    
    if (findError) throw findError;

    if (existing?.id) {
      const { data, error } = await supabase
        .from('integration_configs')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
      return;
    }

    const { data, error } = await supabase.from('integration_configs').insert(payload).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteIntegrationConfig = async (req: Request, res: Response) => {
  const { id } = req.query;
  
  if (!id) {
    res.status(400).json({ error: 'ID is required' });
    return;
  }

  try {
    // Soft Delete
    const { error } = await supabase
      .from('integration_configs')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const testEmailSend = async (req: Request, res: Response) => {
  const { to } = req.body || {};
  if (!to || typeof to !== 'string') {
    res.status(400).json({ error: 'to is required' });
    return;
  }

  try {
    const result = await EmailService.sendTestEmail(to);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Email test failed' });
  }
};

export const testLLMConnection = async (req: Request, res: Response) => {
  const config = req.body;
  
  if (!config || !config.provider || !config.apiKey) {
    res.status(400).json({ error: 'Missing provider configuration (provider, apiKey)' });
    return;
  }

  try {
    const providerConfig: ProviderConfig = {
      id: 'test-connection',
      provider: config.provider,
      model: config.model || 'gpt-3.5-turbo',
      apiKey: config.apiKey,
      baseUrl: config.endpoint,
      priority: 0
    };

    let provider;
    switch (config.provider) {
      case 'google':
        provider = new GeminiProvider(providerConfig);
        break;
      case 'openai':
      case 'deepseek':
      case 'azure':
      case 'anthropic': // Note: OpenAIProvider fallback might work for some if compatible, otherwise need specific provider
      case 'openrouter':
      case 'together':
      case 'fireworks':
      case 'groq':
      case 'mistral':
      case 'cohere':
      case 'xai':
      case 'perplexity':
      case 'dashscope':
      case 'qianfan':
      case 'zhipu':
      case 'moonshot':
        // Most of these are OpenAI compatible in this system or use the generic OpenAIProvider with base URL
        provider = new OpenAIProvider(providerConfig);
        break;
      default:
        provider = new OpenAIProvider(providerConfig);
        break;
    }

    const response = await provider.chat({
      messages: [{ role: 'user', content: '你好，你是谁？' }],
      temperature: 0.7,
      maxTokens: 100
    });

    res.json({ success: true, message: response.content });
  } catch (error: any) {
    console.error('Test Connection Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

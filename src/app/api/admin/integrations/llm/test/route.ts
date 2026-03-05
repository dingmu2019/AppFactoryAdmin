
import { NextRequest, NextResponse } from 'next/server';
import { ProviderConfig } from '@/services/ai/providers/BaseAIProvider';
import { OpenAIProvider } from '@/services/ai/providers/OpenAIProvider';
import { GeminiProvider } from '@/services/ai/providers/GeminiProvider';

export async function POST(req: NextRequest) {
  try {
    const config = await req.json();
    
    if (!config || !config.provider || !config.apiKey) {
      return NextResponse.json({ error: 'Missing provider configuration (provider, apiKey)' }, { status: 400 });
    }

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
      case 'anthropic': 
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
      case 'minimax':
        // Most use OpenAI compatible API
        provider = new OpenAIProvider(providerConfig);
        break;
      default:
        provider = new OpenAIProvider(providerConfig);
        break;
    }

    const response = await provider.chat({
      messages: [{ role: 'user', content: '你好，你是谁？' }],
      temperature: typeof config.temperature === 'number' ? config.temperature : 0.7,
      maxTokens: typeof config.maxTokens === 'number' ? config.maxTokens : 100
    });

    return NextResponse.json({ success: true, message: response.content });
  } catch (error: any) {
    console.error('Test Connection Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const normalizeUrlInput = (value: unknown) => {
  const raw = String(value ?? '').trim();
  return raw.replace(/^`+|`+$/g, '').trim().replace(/\/$/, '');
};

const normalizeSecretInput = (value: unknown) => {
  const raw = String(value ?? '').trim();
  return raw.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error:
            'Supabase URL/Key 缺失：请在 .env.local 配置 NEXT_PUBLIC_SUPABASE_URL 以及 NEXT_PUBLIC_SUPABASE_ANON_KEY 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const store: any = cookieStore as any;
          if (typeof store.set === 'function') {
            try {
              store.set(name, value, options);
              return;
            } catch {}
            try {
              store.set({ name, value, ...options });
              return;
            } catch {}
          }
        },
        remove(name: string, options: CookieOptions) {
          const store: any = cookieStore as any;
          if (typeof store.delete === 'function') {
            try {
              store.delete(name);
              return;
            } catch {}
          }
          if (typeof store.set === 'function') {
            try {
              store.set(name, '', options);
              return;
            } catch {}
            try {
              store.set({ name, value: '', ...options });
              return;
            } catch {}
          }
        },
      },
    });
    const { messages, systemPrompt } = await req.json();

    // 1. Verify User
    const { data: { session } } = await supabase.auth.getSession();
    
    // Allow service_role access (e.g. for background jobs or internal tools) if header present
    const isServiceRole = req.headers.get('x-admin-secret') === process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!session && !isServiceRole) {
      // Temporary workaround: if no session in cookie, check if Authorization header has Bearer token
      // This helps when middleware fails to sync cookie or client sends token directly
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) {
              // Valid token in header, proceed
          } else {
              return new NextResponse('Unauthorized: Invalid token', { status: 401 });
          }
      } else {
          return new NextResponse('Unauthorized: Please login first', { status: 401 });
      }
    }

    // 2. Fetch LLM Config (Securely on server)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const configClient = serviceKey
      ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
      : supabase;

    const { data: configData, error: configError } = await configClient
      .from('integration_configs')
      .select('config')
      .eq('category', 'llm')
      .eq('is_enabled', true)
      .single();

    if (configError || !configData) {
      return new NextResponse('LLM Configuration missing or disabled', { status: 404 });
    }

    const config = configData.config;
    const providerRaw = String(config.provider ?? 'openai');
    const provider = providerRaw === 'google' ? 'gemini' : providerRaw;
    const apiKey = normalizeSecretInput(config.apiKey);
    let baseUrl = normalizeUrlInput(config.baseUrl ?? config.endpoint ?? config.url ?? '');

    if (!baseUrl) baseUrl = 'https://api.openai.com/v1';
    if (baseUrl && !baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

    // 3. Prepare Messages
    const finalMessages = [...messages];
    if (systemPrompt) {
        finalMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const temperature = typeof config.temperature === 'number' ? config.temperature : 0.7;
    const maxTokens = typeof config.maxTokens === 'number' ? config.maxTokens : undefined;
    const model = String(config.model ?? '').trim();

    const system = finalMessages.find((m: any) => m.role === 'system')?.content;

    // 4. Call LLM Provider (Server-to-Server, bypassing CORS)
    if (provider === 'gemini') {
      const isGenerateContentEndpoint =
        /:generateContent(\?.*)?$/.test(baseUrl) || /\/models\/[^/]+:generateContent(\?.*)?$/.test(baseUrl);

      const geminiUrl = isGenerateContentEndpoint
        ? baseUrl
        : `${baseUrl}/models/${encodeURIComponent(model || 'gemini-1.5-flash')}:generateContent`;

      const shouldUseQueryKey = /googleapis\.com|generativelanguage/.test(geminiUrl);
      const urlWithKey =
        apiKey && shouldUseQueryKey && !/[?&]key=/.test(geminiUrl)
          ? geminiUrl + (geminiUrl.includes('?') ? `&key=${encodeURIComponent(apiKey)}` : `?key=${encodeURIComponent(apiKey)}`)
          : geminiUrl;

      const contents = finalMessages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const response = await fetch(urlWithKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-goog-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            temperature,
            ...(typeof maxTokens === 'number' ? { maxOutputTokens: maxTokens } : {}),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] LLM Provider Error:', response.status, errorText);
        return new NextResponse(`LLM Provider Error: ${response.status} - ${errorText}`, { status: response.status });
      }

      const data = await response.json();
      const aiContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ content: aiContent });
    }

    const isChatCompletionsEndpoint = /\/chat\/completions(\?.*)?$/.test(baseUrl);
    const openaiUrl = isChatCompletionsEndpoint ? baseUrl : `${baseUrl}/chat/completions`;

    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: finalMessages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        ...(typeof maxTokens === 'number' ? { max_tokens: maxTokens } : {}),
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] LLM Provider Error:', response.status, errorText);
        return new NextResponse(`LLM Provider Error: ${response.status} - ${errorText}`, { status: response.status });
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content || '';

    return NextResponse.json({ content: aiContent });

  } catch (error: any) {
    console.error('[API] Internal Error:', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}

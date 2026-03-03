
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import crypto from 'crypto';

// Helper to generate keys
const generateCredentials = () => {
  const apiKey = 'pk_' + crypto.randomBytes(16).toString('hex');
  const apiSecret = 'sk_' + crypto.randomBytes(24).toString('hex');
  return { apiKey, apiSecret };
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(req);
    const { data, error } = await supabase
      .from('saas_apps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching apps:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mask secrets in list view
    const maskedData = (data || []).map((app: any) => ({
      ...app,
      api_secret: app.api_secret ? `${app.api_secret.substring(0, 5)}...` : null
    }));

    return NextResponse.json(maskedData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, status, config, id, allowed_ips, template } = body;
    const { apiKey, apiSecret } = generateCredentials();
    const supabase = getSupabaseForRequest(req);
    
    // In Next.js App Router, we'd typically get user from session/context
    // For now, we'll rely on what Supabase client provides or request context if middleware sets it
    const owner_id = null; // To be implemented with proper Auth migration

    // Template Logic
    let initialConfig = config || {};
    let webhooksToCreate: any[] = [];

    if (template === 'ecommerce') {
      initialConfig = {
        ...initialConfig,
        features: ['products', 'orders', 'payments', 'inventory'],
        settings: { currency: 'CNY', tax_rate: 0 }
      };
      webhooksToCreate = [
        { event: 'ORDER.PAID', url: 'https://api.yourapp.com/webhooks/orders' },
        { event: 'REFUND.SUCCESS', url: 'https://api.yourapp.com/webhooks/refunds' }
      ];
    } else if (template === 'ai_agent') {
      initialConfig = {
        ...initialConfig,
        features: ['ai_gateway', 'knowledge_base', 'chat'],
        ai_model: 'gemini-3-flash-preview',
        quota: { daily_tokens: 100000 }
      };
    } else if (template === 'tooling') {
      initialConfig = {
        ...initialConfig,
        features: ['webhooks', 'api_access'],
        rate_limit: 1000
      };
    }

    const insertPayload: any = {
      name,
      description,
      status: status || 'Development',
      api_key: apiKey,
      api_secret: apiSecret,
      config: initialConfig,
      allowed_ips,
      owner_id
    };

    if (id) {
      insertPayload.id = id;
    }

    const { data: app, error } = await supabase
      .from('saas_apps')
      .insert([insertPayload])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (webhooksToCreate.length > 0 && app) {
      const webhookInserts = webhooksToCreate.map(wh => ({
        app_id: app.id,
        url: wh.url,
        events: [wh.event],
        secret: 'whsec_' + crypto.randomBytes(16).toString('hex'),
        is_active: false,
        description: `Auto-created by ${template} template`
      }));

      await supabase.from('webhooks').insert(webhookInserts);
    }

    return NextResponse.json(app, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

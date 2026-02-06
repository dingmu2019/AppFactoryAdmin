import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to generate keys
const generateCredentials = () => {
  const apiKey = 'pk_' + crypto.randomBytes(16).toString('hex');
  const apiSecret = 'sk_' + crypto.randomBytes(24).toString('hex');
  return { apiKey, apiSecret };
};

export const getApps = async (req: Request, res: Response, next: any) => {
  console.log('Fetching apps...');
  try {
    const { data, error } = await supabase
      .from('saas_apps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching apps:', error);
      // Ensure we don't leak internal error details unless necessary, but throwing helps middleware log it
      throw error; 
    }

    console.log(`Fetched ${data?.length} apps`);

    // Mask secrets in list view
    const maskedData = (data || []).map(app => ({
      ...app,
      api_secret: app.api_secret ? `${app.api_secret.substring(0, 5)}...` : null
    }));

    res.json(maskedData);
  } catch (err) {
      next(err);
  }
};

export const createApp = async (req: Request, res: Response) => {
  const { name, description, status, config, id, allowed_ips, template } = req.body;
  const { apiKey, apiSecret } = generateCredentials();
  
  // Use user id from middleware if available, otherwise assume admin/system
  const owner_id = (req as any).user?.id;

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
    // No default webhooks, or maybe one for audit
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

  // If ID is provided, use it (Assuming UUID format)
  if (id) {
    insertPayload.id = id;
  }

  const { data: app, error } = await supabase
    .from('saas_apps')
    .insert([insertPayload])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Post-creation actions (Webhooks)
  if (webhooksToCreate.length > 0 && app) {
    const webhookInserts = webhooksToCreate.map(wh => ({
      app_id: app.id,
      url: wh.url,
      events: [wh.event], // Array of strings
      secret: 'whsec_' + crypto.randomBytes(16).toString('hex'),
      is_active: false, // Default to inactive, user needs to update URL
      description: `Auto-created by ${template} template`
    }));

    const { error: whError } = await supabase
      .from('webhooks')
      .insert(webhookInserts);
    
    if (whError) {
        console.error('Failed to create template webhooks:', whError);
        // We don't fail the request, just log it
    }
  }

  res.status(201).json(app);
};

export const updateApp = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, status, config, allowed_ips } = req.body;

  const { data, error } = await supabase
    .from('saas_apps')
    .update({ name, description, status, config, allowed_ips })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const deleteApp = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`Deleting app: ${id}`);

  try {
    const { error } = await supabase
      .from('saas_apps')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`Successfully deleted app: ${id}`);
    res.json({ success: true, message: 'App deleted successfully' });
  } catch (err) {
    console.error('Unexpected delete error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAppCredentials = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const { data, error } = await supabase
    .from('saas_apps')
    .select('api_key, api_secret')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'App not found' });
  
  // Return full credentials (should be protected by password check in production)
  res.json(data);
};

export const rotateAppCredentials = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { apiKey, apiSecret } = generateCredentials();

  const { data, error } = await supabase
    .from('saas_apps')
    .update({ 
      api_key: apiKey, 
      api_secret: apiSecret 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to rotate credentials' });
  res.json(data);
};

// Config Schema Endpoint
export const getAppConfigSchema = async (req: Request, res: Response) => {
  // In a real system, this might come from a DB table `config_schemas` or dynamic logic
  // For now, we define a static schema that covers all templates
  const schema = {
    title: "App Configuration",
    type: "object",
    properties: {
      ai_model: {
        type: "string",
        title: "AI Model",
        enum: ["gemini-3-flash-preview", "gemini-3-pro-preview", "gpt-4o", "claude-3-opus"],
        default: "gemini-3-flash-preview"
      },
      dify_app_id: {
        type: "string",
        title: "Dify App ID",
        description: "Binding ID for Dify.ai Agent"
      },
      feishu_config: {
        type: "object",
        title: "Feishu Integration",
        properties: {
          app_id: { type: "string", title: "App ID" },
          app_secret: { type: "string", title: "App Secret", format: "password" },
          encrypt_key: { type: "string", title: "Encrypt Key" }
        }
      },
      features: {
        type: "array",
        title: "Enabled Features",
        items: {
          type: "string",
          enum: ["ai_gateway", "webhooks", "orders", "payments", "knowledge_base"]
        },
        uniqueItems: true
      },
      rate_limit: {
        type: "integer",
        title: "Rate Limit (req/min)",
        default: 60,
        minimum: 0
      }
    }
  };

  res.json(schema);
};

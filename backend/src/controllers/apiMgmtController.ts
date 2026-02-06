import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ApiSyncService } from '../services/apiSyncService.ts';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_API_SCHEMAS = new Map<
  string,
  { requestSchema: unknown; responseSchema: unknown }
>([
  [
    'GET /api/admin/users',
    {
      requestSchema: {
        headers: [
          { name: 'x-app-key', type: 'string', required: true, description: 'App key' },
          { name: 'x-app-secret', type: 'string', required: true, description: 'App secret' }
        ],
        query: [
          { name: 'page', type: 'integer', required: false, default: 1, description: 'Page number (>= 1)' },
          { name: 'pageSize', type: 'integer', required: false, default: 20, description: 'Page size' },
          { name: 'search', type: 'string', required: false, description: 'Search by email/full_name (ILIKE)' },
          { name: 'role', type: 'string', required: false, description: 'Filter by role (roles contains)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status' }
        ]
      },
      responseSchema: {
        200: {
          description: 'Paginated users',
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    full_name: { type: ['string', 'null'] },
                    avatar_url: { type: ['string', 'null'] },
                    roles: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string' },
                    gender: { type: 'string' },
                    phone_number: { type: ['string', 'null'] },
                    region: { type: ['object', 'null'] },
                    session_version: { type: 'integer' },
                    source_app_id: { type: ['string', 'null'], format: 'uuid' },
                    last_sign_in_at: { type: ['string', 'null'], format: 'date-time' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' }
                  }
                }
              },
              total: { type: 'integer' },
              page: { type: 'integer' },
              pageSize: { type: 'integer' }
            }
          }
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' }
      }
    }
  ],
  [
    'GET /api/v1/integrations/llm',
    {
        requestSchema: {
            headers: [
                { name: 'x-app-key', type: 'string', required: true, description: 'App key' },
                { name: 'x-app-secret', type: 'string', required: true, description: 'App secret' }
            ]
        },
        responseSchema: {
            200: { description: 'LLM Configs', schema: { type: 'object', properties: { data: { type: 'array' } } } }
        }
    }
  ],
  [
    'GET /api/v1/integrations/email',
    {
        requestSchema: {
            headers: [
                { name: 'x-app-key', type: 'string', required: true, description: 'App key' },
                { name: 'x-app-secret', type: 'string', required: true, description: 'App secret' }
            ]
        },
        responseSchema: {
            200: { description: 'Email Configs', schema: { type: 'object', properties: { data: { type: 'array' } } } }
        }
    }
  ],
  [
    'GET /api/v1/integrations/database',
    {
        requestSchema: {
            headers: [
                { name: 'x-app-key', type: 'string', required: true, description: 'App key' },
                { name: 'x-app-secret', type: 'string', required: true, description: 'App secret' }
            ]
        },
        responseSchema: {
            200: { description: 'Database Configs', schema: { type: 'object', properties: { data: { type: 'array' } } } }
        }
    }
  ],
  [
    'POST /api/v1/integrations/email/send',
    {
        requestSchema: {
            headers: [
                { name: 'x-app-key', type: 'string', required: true, description: 'App key' },
                { name: 'x-app-secret', type: 'string', required: true, description: 'App secret' }
            ],
            body: {
                type: 'object',
                required: ['to', 'subject', 'html'],
                properties: {
                    to: { type: 'string', format: 'email' },
                    subject: { type: 'string' },
                    html: { type: 'string' }
                }
            }
        },
        responseSchema: {
            200: { description: 'Email Queued', schema: { type: 'object', properties: { success: { type: 'boolean' } } } }
        }
    }
  ],
  [
    'POST /api/v1/integrations/llm/chat',
    {
        requestSchema: {
            headers: [
                { name: 'x-app-key', type: 'string', required: true, description: 'App key' },
                { name: 'x-app-secret', type: 'string', required: true, description: 'App secret' }
            ],
            body: {
                type: 'object',
                required: ['message'],
                properties: {
                    message: { type: 'string' },
                    model: { type: 'string', description: 'Optional model override' }
                }
            }
        },
        responseSchema: {
            200: { description: 'AI Response', schema: { type: 'object', properties: { response: { type: 'string' } } } }
        }
    }
  ]
]);

function isEmptySchema(value: unknown) {
  if (!value) return true;
  if (typeof value !== 'object') return false;
  return Object.keys(value as Record<string, unknown>).length === 0;
}

// GET /api/admin/apis
export const listApis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('sys_api_definitions')
      .select('*')
      .order('path', { ascending: true });

    if (error) {
        console.error('Supabase Error in listApis:', error);
        throw error;
    }

    // Transform data to match expected frontend interface if needed, 
    // but the DB columns match standard naming (except snake_case vs camelCase)
    // The frontend expects camelCase: authRequired, but DB has auth_required.
    // We should map it.
    
    const mappedData = (data || []).map(item => {
        const fallback = DEFAULT_API_SCHEMAS.get(`${item.method} ${item.path}`);
        const requestSchema = (item as any).request_schema;
        const responseSchema = (item as any).response_schema;

        return ({
        id: item.id,
        path: item.path,
        method: item.method,
        summary: item.summary,
        description: item.description,
        category: item.category,
        authRequired: item.auth_required, // Map snake_case to camelCase
        requestSchema: !isEmptySchema(requestSchema) ? requestSchema : (fallback?.requestSchema ?? null),
        responseSchema: !isEmptySchema(responseSchema) ? responseSchema : (fallback?.responseSchema ?? null),
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      });
    });

    res.json({
      total: mappedData.length,
      data: mappedData
    });
  } catch (error: any) {
    console.error('Exception in listApis:', error);
    next(error);
  }
};

// GET /api/admin/apis/:id
export const getApiDetail = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('sys_api_definitions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
       if (error.code === 'PGRST116') {
           return res.status(404).json({ error: 'API not found' });
       }
       throw error;
    }

    const fallback = DEFAULT_API_SCHEMAS.get(`${data.method} ${data.path}`);
    const requestSchema = (data as any).request_schema;
    const responseSchema = (data as any).response_schema;

    const mappedItem = {
        id: data.id,
        path: data.path,
        method: data.method,
        summary: data.summary,
        description: data.description,
        category: data.category,
        authRequired: data.auth_required,
        requestSchema: !isEmptySchema(requestSchema) ? requestSchema : (fallback?.requestSchema ?? null),
        responseSchema: !isEmptySchema(responseSchema) ? responseSchema : (fallback?.responseSchema ?? null),
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };

    res.json(mappedItem);
  } catch (error: any) {
    next(error);
  }
};

// POST /api/admin/apis/sync
export const syncApis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ApiSyncService.sync();
    res.json(result);
  } catch (error: any) {
    next(error);
  }
};

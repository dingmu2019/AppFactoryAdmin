import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { SYSTEM_CONFIG } from '@/constants';

function toOpenApiPath(p: string) {
  return (p || '').replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function mapPrimitiveSchema(type: string | undefined) {
  const normalized = (type || 'string').toLowerCase();
  if (normalized === 'integer' || normalized === 'int') return { type: 'integer' as const };
  if (normalized === 'number' || normalized === 'float' || normalized === 'double') return { type: 'number' as const };
  if (normalized === 'boolean' || normalized === 'bool') return { type: 'boolean' as const };
  const strMatch = normalized.match(/^string\((.+)\)$/);
  if (strMatch) return { type: 'string' as const, format: strMatch[1] };
  return { type: 'string' as const };
}

function buildParameters(input: any) {
  const parameters: any[] = [];

  const headerItems: any[] = Array.isArray(input?.headers) ? input.headers : [];
  for (const h of headerItems) {
    if (!h?.name) continue;
    const schema: any = { ...mapPrimitiveSchema(h.type), ...(h.default !== undefined ? { default: h.default } : {}) };
    if (h.example) schema.example = h.example;
    parameters.push({
      name: h.name,
      in: 'header',
      required: !!h.required,
      description: h.description,
      schema
    });
  }

  const pathItems: any[] = Array.isArray(input?.path) ? input.path : [];
  for (const p of pathItems) {
    if (!p?.name) continue;
    const schema: any = { ...mapPrimitiveSchema(p.type) };
    if (p.example) schema.example = p.example;
    parameters.push({
      name: p.name,
      in: 'path',
      required: p.required !== false,
      description: p.description,
      schema
    });
  }

  const queryItems: any[] = Array.isArray(input?.query) ? input.query : [];
  for (const q of queryItems) {
    if (!q?.name) continue;
    const schema: any = { ...mapPrimitiveSchema(q.type), ...(q.default !== undefined ? { default: q.default } : {}) };
    if (q.example) schema.example = q.example;
    parameters.push({
      name: q.name,
      in: 'query',
      required: !!q.required,
      description: q.description,
      schema
    });
  }

  return parameters;
}

function buildRequestBody(input: any) {
  const body = input?.body;
  if (!body) return undefined;

  if (Array.isArray(body)) {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const f of body) {
      if (!f?.name) continue;
      properties[f.name] = { ...mapPrimitiveSchema(f.type), ...(f.description ? { description: f.description } : {}) };
      if (f.required) required.push(f.name);
    }
    return {
      required: body.some((f: any) => !!f?.required),
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties,
            ...(required.length > 0 ? { required } : {})
          }
        }
      }
    };
  }

  if (typeof body === 'object') {
    const schema = (body as any).schema ? (body as any).schema : body;
    if (schema && typeof schema === 'object') {
      return {
        required: true,
        content: {
          'application/json': {
            schema
          }
        }
      };
    }
  }

  return undefined;
}

function buildResponses(responseSchema: any) {
  const responses: Record<string, any> = {};
  if (!responseSchema || typeof responseSchema !== 'object') {
    responses['200'] = { description: 'OK' };
    return responses;
  }

  for (const [status, value] of Object.entries(responseSchema)) {
    if (status === 'markdown') continue;
    const v: any = value as any;
    const schema = v?.schema;
    const description = v?.description || 'Response';
    if (schema) {
      responses[status] = {
        description,
        content: {
          'application/json': {
            schema
          }
        }
      };
    } else {
      responses[status] = { description };
    }
  }

  if (!responses['default']) responses['default'] = { description: 'Unexpected error' };
  return responses;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sys_api_definitions')
      .select('*')
      .order('path', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const defs = (data || []).filter((row: any) => {
      if (row?.is_active === false) return false;
      const category = String(row?.category || '');
      if (category.startsWith('Admin')) return false;
      const p = String(row?.path || '');
      if (p.startsWith('/api/admin/')) return false;
      if (p.startsWith('/api/debug/')) return false;
      if (p.startsWith('/api/public/')) return false;
      return true;
    });

    const paths: Record<string, any> = {};
    for (const row of defs) {
      const p = toOpenApiPath(String(row.path || ''));
      const method = String(row.method || 'GET').toLowerCase();
      paths[p] ||= {};
      paths[p][method] = {
        summary: row.summary || undefined,
        description: row.description || undefined,
        tags: row.category ? [row.category] : undefined,
        ...(row.auth_required ? { security: [{ bearerAuth: [] }] } : {}),
        ...(row.request_schema ? { parameters: buildParameters(row.request_schema) } : {}),
        ...(row.request_schema ? { requestBody: buildRequestBody(row.request_schema) } : {}),
        responses: buildResponses(row.response_schema)
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const doc = {
      openapi: '3.0.3',
      info: {
        title: 'AdminSys Public API',
        version: SYSTEM_CONFIG.version
      },
      servers: [{ url: baseUrl }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer'
          }
        }
      },
      paths
    };

    return NextResponse.json(doc, {
      headers: {
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


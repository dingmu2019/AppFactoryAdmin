import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type ApiDefinitionRow = {
  id: string;
  path: string;
  method: string;
  summary: string | null;
  description: string | null;
  category: string | null;
  auth_required: boolean | null;
  is_active: boolean | null;
  request_schema: any | null;
  response_schema: any | null;
};

function toOpenApiPath(path: string) {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function extractPathParams(path: string) {
  const matches = [...path.matchAll(/:([A-Za-z0-9_]+)/g)];
  return matches.map(m => m[1]);
}

function mapPrimitiveSchema(type: string | undefined) {
  const normalized = (type || 'string').toLowerCase();
  if (normalized === 'integer' || normalized === 'int') return { type: 'integer' };
  if (normalized === 'number' || normalized === 'float' || normalized === 'double') return { type: 'number' };
  if (normalized === 'boolean' || normalized === 'bool') return { type: 'boolean' };
  const strMatch = normalized.match(/^string\((.+)\)$/);
  if (strMatch) return { type: 'string', format: strMatch[1] };
  return { type: 'string' };
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
      required: body.some((f: any) => f?.required),
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

  if (typeof body === 'object' && body.type === 'array') {
    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { type: 'object' }
          }
        }
      }
    };
  }

  if (typeof body === 'object') {
    const schema = body.schema ? body.schema : body;
    if (schema && (schema.type === 'object' || schema.type === 'array' || schema.properties || schema.items || schema.$ref)) {
      return {
        required: !!schema.required && (Array.isArray(schema.required) ? schema.required.length > 0 : true),
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

  if (!responses['default']) {
    responses['default'] = { description: 'Unexpected error' };
  }

  return responses;
}

function collectComponentSchemaRefs(value: any, acc: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectComponentSchemaRefs(item, acc);
    return;
  }
  if (typeof value !== 'object') return;

  const ref = (value as any).$ref;
  if (typeof ref === 'string') {
    const m = ref.match(/^#\/components\/schemas\/([A-Za-z0-9_]+)$/);
    if (m) acc.add(m[1]);
  }

  for (const v of Object.values(value as Record<string, any>)) {
    collectComponentSchemaRefs(v, acc);
  }
}

function shouldIncludeInPublicDocs(row: ApiDefinitionRow) {
  const path = row.path || '';
  const isActive = row.is_active !== false;
  if (!isActive) return false;
  if (path.startsWith('/api/debug/')) return false;
  if (path.startsWith('/api/public/')) return false;
  return true;
}

async function loadApiDefinitionsForPublicDocs() {
  const { data, error } = await supabase
    .from('sys_api_definitions')
    .select(
      'id,path,method,summary,description,category,auth_required,is_active,request_schema,response_schema'
    )
    .order('path', { ascending: true });

  if (error) throw error;
  const rows = (data || []) as unknown as ApiDefinitionRow[];
  return rows.filter(shouldIncludeInPublicDocs);
}

function buildOpenApiSpec(definitions: ApiDefinitionRow[], baseUrl: string) {
  const paths: Record<string, any> = {};
  const referencedSchemas = new Set<string>();

  for (const def of definitions) {
    const rawPath = def.path;
    const method = (def.method || 'GET').toLowerCase();
    const openPath = toOpenApiPath(rawPath);

    const pathParams = extractPathParams(rawPath).map(p => ({
      name: p,
      in: 'path',
      required: true,
      schema: { type: 'string' }
    }));

    const requestSchema = def.request_schema || {};
    const parameters = [...pathParams, ...buildParameters(requestSchema)];
    const requestBody = buildRequestBody(requestSchema);

    const operation: any = {
      summary: def.summary || undefined,
      description: def.description || undefined,
      tags: [def.category || 'API'],
      parameters: parameters.length > 0 ? parameters : undefined,
      responses: buildResponses(def.response_schema),
      requestBody
    };

    collectComponentSchemaRefs(def.request_schema, referencedSchemas);
    collectComponentSchemaRefs(def.response_schema, referencedSchemas);

    const authType = requestSchema?.auth?.type || (def.path.startsWith('/api/v1/') ? (def.auth_required ? 'appKey' : 'none') : def.auth_required ? 'bearer' : 'none');
    if (authType === 'bearer') {
      operation.security = [{ bearerAuth: [] }];
    } else if (authType === 'appKey') {
      operation.security = [{ appKeyHeader: [] }, { appSecretHeader: [] }];
    }

    if (!paths[openPath]) paths[openPath] = {};
    paths[openPath][method] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'AdminSys API',
      version: '0.1.0',
      description: 'Public API documentation'
    },
    servers: [{ url: baseUrl }],
    components: {
      schemas: Object.fromEntries(
        [...referencedSchemas].sort().map(name => [
          name,
          { type: 'object', description: 'Schema placeholder (not expanded in catalog)' }
        ])
      ),
      securitySchemes: {
        appKeyHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-app-key'
        },
        appSecretHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-app-secret'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths
  };
}

/**
 * @openapi
 * /api/public/openapi.json:
 *   get:
 *     tags: [Public Docs]
 *     summary: Get OpenAPI Spec
 *     responses:
 *       200:
 *         description: OpenAPI JSON
 */
router.get('/openapi.json', async (_req, res) => {
  try {
    const baseUrl =
      process.env.PUBLIC_API_BASE_URL ||
      process.env.VITE_API_URL ||
      'http://localhost:3001';

    const definitions = await loadApiDefinitionsForPublicDocs();
    const spec = buildOpenApiSpec(definitions, baseUrl);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(spec);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to build OpenAPI spec' });
  }
});

/**
 * @openapi
 * /api/public/apis:
 *   get:
 *     tags: [Public Docs]
 *     summary: List public APIs
 *     responses:
 *       200:
 *         description: List of APIs
 */
router.get('/apis', async (_req, res) => {
  try {
    const definitions = await loadApiDefinitionsForPublicDocs();
    const mapped = definitions.map(d => ({
      id: d.id,
      path: d.path,
      method: d.method,
      summary: d.summary,
      description: d.description,
      category: d.category,
      authRequired: d.auth_required,
      requestSchema: d.request_schema,
      responseSchema: d.response_schema
    }));
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ total: mapped.length, data: mapped });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load APIs' });
  }
});

/**
 * @openapi
 * /api/public/docs:
 *   get:
 *     tags: [Public Docs]
 *     summary: API Documentation UI
 *     responses:
 *       200:
 *         description: HTML page
 */
router.get('/docs', (_req, res) => {
  const openapiUrl = '/api/public/openapi.json';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>AdminSys API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; }
      #swagger-ui { height: 100%; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${openapiUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.send(html);
});

export default router;

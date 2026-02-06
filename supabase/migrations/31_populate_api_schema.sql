-- Populate request/response schemas for selected APIs (best-effort defaults)

-- GET /api/admin/users
UPDATE sys_api_definitions
SET
  request_schema = $$
  {
    "headers": [
      { "name": "x-app-key", "type": "string", "required": true, "description": "App key" },
      { "name": "x-app-secret", "type": "string", "required": true, "description": "App secret" }
    ],
    "query": [
      { "name": "page", "type": "integer", "required": false, "default": 1, "description": "Page number (>= 1)" },
      { "name": "pageSize", "type": "integer", "required": false, "default": 20, "description": "Page size" },
      { "name": "search", "type": "string", "required": false, "description": "Search by email/full_name (ILIKE)" },
      { "name": "role", "type": "string", "required": false, "description": "Filter by role (roles contains)" },
      { "name": "status", "type": "string", "required": false, "description": "Filter by status" }
    ]
  }
  $$::jsonb,
  response_schema = $$
  {
    "200": {
      "description": "Paginated users",
      "schema": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string", "format": "uuid" },
                "email": { "type": "string", "format": "email" },
                "full_name": { "type": ["string","null"] },
                "avatar_url": { "type": ["string","null"] },
                "roles": { "type": "array", "items": { "type": "string" } },
                "status": { "type": "string" },
                "gender": { "type": "string" },
                "phone_number": { "type": ["string","null"] },
                "region": { "type": ["object","null"] },
                "session_version": { "type": "integer" },
                "source_app_id": { "type": ["string","null"], "format": "uuid" },
                "last_sign_in_at": { "type": ["string","null"], "format": "date-time" },
                "created_at": { "type": "string", "format": "date-time" },
                "updated_at": { "type": "string", "format": "date-time" }
              }
            }
          },
          "total": { "type": "integer" },
          "page": { "type": "integer" },
          "pageSize": { "type": "integer" }
        }
      }
    },
    "401": { "description": "Unauthorized" },
    "403": { "description": "Forbidden" }
  }
  $$::jsonb
WHERE path = '/api/admin/users'
  AND method = 'GET'
  AND (request_schema IS NULL OR request_schema = '{}'::jsonb OR response_schema IS NULL OR response_schema = '{}'::jsonb);

-- GET /api/admin/apis
UPDATE sys_api_definitions
SET
  request_schema = $$
  {
    "headers": [
      { "name": "x-app-key", "type": "string", "required": true },
      { "name": "x-app-secret", "type": "string", "required": true }
    ]
  }
  $$::jsonb,
  response_schema = $$
  {
    "200": {
      "description": "API catalog list",
      "schema": {
        "type": "object",
        "properties": {
          "total": { "type": "integer" },
          "data": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string", "format": "uuid" },
                "path": { "type": "string" },
                "method": { "type": "string" },
                "summary": { "type": ["string","null"] },
                "description": { "type": ["string","null"] },
                "category": { "type": ["string","null"] },
                "authRequired": { "type": "boolean" },
                "requestSchema": { "type": ["object","null"] },
                "responseSchema": { "type": ["object","null"] }
              }
            }
          }
        }
      }
    },
    "401": { "description": "Unauthorized" },
    "403": { "description": "Forbidden" }
  }
  $$::jsonb
WHERE path = '/api/admin/apis'
  AND method = 'GET'
  AND (request_schema IS NULL OR request_schema = '{}'::jsonb OR response_schema IS NULL OR response_schema = '{}'::jsonb);

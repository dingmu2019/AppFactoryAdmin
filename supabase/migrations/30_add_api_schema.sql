-- Add OpenAPI-like request/response schema columns to sys_api_definitions
ALTER TABLE sys_api_definitions
ADD COLUMN IF NOT EXISTS request_schema JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS response_schema JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN sys_api_definitions.request_schema IS 'OpenAPI-like request schema (headers/query/path/body)';
COMMENT ON COLUMN sys_api_definitions.response_schema IS 'OpenAPI-like response schema (status -> schema)';

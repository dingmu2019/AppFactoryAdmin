-- 18_universal_identity_rbac.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Enhanced RBAC System (Granular Permissions)
-- -----------------------------------------------------------------------------

-- Roles table (Dynamic roles, replacing the hardcoded ENUM)
CREATE TABLE rbac_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE rbac_roles IS 'RBAC Role definitions';
COMMENT ON COLUMN rbac_roles.is_system IS 'If true, this role is built-in and cannot be deleted';

-- Permissions table (Resource + Action)
CREATE TABLE rbac_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'users:read', 'reports:export'
    resource VARCHAR(50) NOT NULL, -- e.g., 'users'
    action VARCHAR(50) NOT NULL, -- e.g., 'read'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE rbac_permissions IS 'Fine-grained permissions definition';

-- Role-Permission Mapping
CREATE TABLE rbac_role_permissions (
    role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES rbac_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- User-Role Mapping (Many-to-Many)
CREATE TABLE rbac_user_roles (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Field-level / Context-aware Policies
CREATE TABLE rbac_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    effect VARCHAR(10) CHECK (effect IN ('allow', 'deny')) DEFAULT 'allow',
    conditions JSONB, -- e.g., {"department": "${user.department}"} or field masking rules
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE rbac_policies IS 'Advanced policies for field-level or context-aware access control';

-- -----------------------------------------------------------------------------
-- 2. OAuth2 / OIDC Provider Extensions
-- -----------------------------------------------------------------------------

-- Enhance saas_apps to act as OAuth2 Clients
ALTER TABLE saas_apps 
ADD COLUMN IF NOT EXISTS client_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS client_secret VARCHAR(255), -- Hashed secret
ADD COLUMN IF NOT EXISTS redirect_uris TEXT[], -- Array of allowed callback URLs
ADD COLUMN IF NOT EXISTS allowed_grants TEXT[] DEFAULT ARRAY['authorization_code', 'refresh_token'],
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS homepage_url TEXT;

-- Generate client_id for existing apps if missing (using api_key as fallback or new uuid)
UPDATE saas_apps SET client_id = api_key WHERE client_id IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Seed Data (Migration from old ENUM)
-- -----------------------------------------------------------------------------

-- Insert default system roles
INSERT INTO rbac_roles (name, description, is_system) VALUES
('admin', 'System Administrator with full access', TRUE),
('editor', 'Content Editor', TRUE),
('viewer', 'Read-only Viewer', TRUE),
('user', 'Standard User', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Migrate existing users' roles (from public.users.roles array to rbac_user_roles)
-- This requires a PL/pgSQL block
DO $$
DECLARE
    r_record RECORD;
    u_record RECORD;
    role_name TEXT;
BEGIN
    FOR u_record IN SELECT id, roles FROM public.users LOOP
        IF u_record.roles IS NOT NULL THEN
            FOREACH role_name IN ARRAY u_record.roles LOOP
                -- Map old enum role name to new rbac_roles id
                INSERT INTO rbac_user_roles (user_id, role_id)
                SELECT u_record.id, id FROM rbac_roles WHERE name = role_name::text
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

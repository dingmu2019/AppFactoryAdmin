CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='integration_configs' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_integration_configs_modtime') THEN
    CREATE TRIGGER update_integration_configs_modtime
      BEFORE UPDATE ON public.integration_configs
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_agents' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_ai_agents_modtime') THEN
    CREATE TRIGGER update_ai_agents_modtime
      BEFORE UPDATE ON public.ai_agents
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agent_prompts' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_agent_prompts_modtime') THEN
    CREATE TRIGGER update_agent_prompts_modtime
      BEFORE UPDATE ON public.agent_prompts
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_categories' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_product_categories_modtime') THEN
    CREATE TRIGGER update_product_categories_modtime
      BEFORE UPDATE ON public.product_categories
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_products_modtime') THEN
    CREATE TRIGGER update_products_modtime
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_skills' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_ai_skills_modtime') THEN
    CREATE TRIGGER update_ai_skills_modtime
      BEFORE UPDATE ON public.ai_skills
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sys_api_definitions' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_sys_api_definitions_modtime') THEN
    CREATE TRIGGER update_sys_api_definitions_modtime
      BEFORE UPDATE ON public.sys_api_definitions
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_roles' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_admin_roles_modtime') THEN
    CREATE TRIGGER update_admin_roles_modtime
      BEFORE UPDATE ON public.admin_roles
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_policies' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_admin_policies_modtime') THEN
    CREATE TRIGGER update_admin_policies_modtime
      BEFORE UPDATE ON public.admin_policies
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON public.product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON public.product_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_products_app_id ON public.products(app_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON public.ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_agents_created_at ON public.ai_agents(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_agent_id ON public.agent_prompts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_prompts_created_at ON public.agent_prompts(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_skills_is_active ON public.ai_skills(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_skills_created_at ON public.ai_skills(created_at);

CREATE INDEX IF NOT EXISTS idx_sys_api_definitions_path ON public.sys_api_definitions(path);
CREATE INDEX IF NOT EXISTS idx_sys_api_definitions_category ON public.sys_api_definitions(category);
CREATE INDEX IF NOT EXISTS idx_sys_api_definitions_is_active ON public.sys_api_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_sys_api_definitions_auth_required ON public.sys_api_definitions(auth_required);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_category ON public.admin_permissions(category);

CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_permission_id ON public.admin_role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user_id ON public.admin_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role_id ON public.admin_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_app_id ON public.admin_user_roles(app_id);

CREATE INDEX IF NOT EXISTS idx_admin_policies_resource_action ON public.admin_policies(resource, action);
CREATE INDEX IF NOT EXISTS idx_admin_policies_effect ON public.admin_policies(effect);

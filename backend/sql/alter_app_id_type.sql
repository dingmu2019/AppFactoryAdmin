-- 1. Drop foreign keys referencing saas_apps.id
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_app_id_fkey;
ALTER TABLE user_app_relations DROP CONSTRAINT IF EXISTS user_app_relations_app_id_fkey;
ALTER TABLE product_app_relations DROP CONSTRAINT IF EXISTS product_app_relations_app_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_app_id_fkey;
ALTER TABLE app_pay_configs DROP CONSTRAINT IF EXISTS app_pay_configs_app_id_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_app_id_fkey;
ALTER TABLE api_access_logs DROP CONSTRAINT IF EXISTS api_access_logs_app_id_fkey;
ALTER TABLE system_error_logs DROP CONSTRAINT IF EXISTS system_error_logs_app_id_fkey;
-- Add missing FKs found during error
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_source_app;

-- 2. Change column type
ALTER TABLE saas_apps ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE audit_logs ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE user_app_relations ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE product_app_relations ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE orders ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE app_pay_configs ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE products ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE api_access_logs ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE system_error_logs ALTER COLUMN app_id TYPE VARCHAR(255);
ALTER TABLE users ALTER COLUMN source_app_id TYPE VARCHAR(255);

-- 3. Restore foreign keys with ON UPDATE CASCADE
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE user_app_relations ADD CONSTRAINT user_app_relations_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE product_app_relations ADD CONSTRAINT product_app_relations_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE orders ADD CONSTRAINT orders_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON UPDATE CASCADE;
ALTER TABLE app_pay_configs ADD CONSTRAINT app_pay_configs_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE api_access_logs ADD CONSTRAINT api_access_logs_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE system_error_logs ADD CONSTRAINT system_error_logs_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE users ADD CONSTRAINT fk_users_source_app FOREIGN KEY (source_app_id) REFERENCES saas_apps(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: 'products' table logic (optional if not strictly enforced before)
-- ALTER TABLE products ADD CONSTRAINT products_app_id_fkey FOREIGN KEY (app_id) REFERENCES saas_apps(id) ON DELETE SET NULL ON UPDATE CASCADE;

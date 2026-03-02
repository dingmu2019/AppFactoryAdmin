-- Fix missing foreign key relationship between products and saas_apps
-- This is necessary because PostgREST schema cache might be stale or the constraint was lost

DO $$
BEGIN
    -- 1. Drop the constraint if it exists (to ensure clean state)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_app_id_fkey' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE public.products DROP CONSTRAINT products_app_id_fkey;
    END IF;

    -- 2. Add the constraint back
    ALTER TABLE public.products
    ADD CONSTRAINT products_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES public.saas_apps(id)
    ON DELETE CASCADE;

    -- 3. Notify PostgREST to reload schema cache
    -- This requires pg_notify privileges which the migration role usually has
    PERFORM pg_notify('pgrst', 'reload schema');
END $$;

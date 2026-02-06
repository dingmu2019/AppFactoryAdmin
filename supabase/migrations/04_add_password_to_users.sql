-- Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add password_hash column to public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN public.users.password_hash IS 'User password hash (encrypted/hashed)';

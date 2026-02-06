-- Add ip_address column to error_logs table
ALTER TABLE error_logs 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

COMMENT ON COLUMN error_logs.ip_address IS 'User IP address';

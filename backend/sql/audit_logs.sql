-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- Can be null for system actions or anonymous
  user_email VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
  resource VARCHAR(100) NOT NULL, -- e.g., 'users', 'database', 'settings'
  details JSONB, -- Stores changes or request body
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILURE'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert logs (or service role)
CREATE POLICY "Allow authenticated insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy: Allow service role to view all logs
CREATE POLICY "Allow service role view" ON audit_logs
  FOR SELECT USING (auth.role() = 'service_role');

-- Policy: Allow users to view their own logs (Optional, usually admins view all)
-- For this AdminSys, we assume the backend uses service_role key to query, so it bypasses RLS.

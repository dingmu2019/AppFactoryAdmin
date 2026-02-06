import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler = async () => {
  console.log('[Skill] Running System Health Check...');
  // Check DB connectivity
  const start = Date.now();
  const { data, error } = await supabase.from('users').select('id').limit(1);
  const latency = Date.now() - start;

  if (error) {
    return JSON.stringify({ status: 'Critical', db_status: 'Disconnected', error: error.message });
  }

  // Check recent errors (last 1 hour)
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count: errorCount } = await supabase
    .from('system_logs')
    .select('*', { count: 'exact', head: true })
    .eq('level', 'error')
    .gt('created_at', oneHourAgo);

  return JSON.stringify({
    status: (errorCount || 0) > 10 ? 'Degraded' : 'Healthy',
    checks: {
        database: { status: 'Connected', latency_ms: latency },
        error_rate: { errors_last_hour: errorCount || 0, threshold: 10 }
    },
    timestamp: new Date().toISOString()
  }, null, 2);
};

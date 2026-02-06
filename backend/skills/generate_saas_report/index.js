import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler = async () => {
  console.log('[Skill] Generating SaaS Daily Pulse Report...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isoYesterday = yesterday.toISOString();

  // New Users
  const { count: newUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).gt('created_at', isoYesterday);
  
  // Active Agents
  const { count: activeAgents } = await supabase.from('ai_agents').select('*', { count: 'exact', head: true }).eq('is_active', true);
  
  // Total Chats
  const { count: totalChats } = await supabase.from('ai_chat_sessions').select('*', { count: 'exact', head: true });

  return JSON.stringify({
    report_date: new Date().toISOString().split('T')[0],
    metrics: {
        new_users_24h: newUsers || 0,
        active_agents: activeAgents || 0,
        total_chat_sessions: totalChats || 0
    },
    summary: "SaaS Platform is operational."
  }, null, 2);
};

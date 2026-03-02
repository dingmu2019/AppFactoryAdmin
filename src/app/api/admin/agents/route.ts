
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Fetch agents (exclude soft deleted)
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch prompt counts
    const agentsWithCounts = await Promise.all((agents || []).map(async (agent) => {
      const { count } = await supabase
        .from('agent_prompts')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id);
      return { ...agent, prompts_count: count || 0 };
    }));

    return NextResponse.json(agentsWithCounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, role, avatar, description, system_prompt, is_active } = body;
    
    // Get max sort_order
    const { data: maxAgent } = await supabase
      .from('ai_agents')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    
    const nextSortOrder = (maxAgent && maxAgent.length > 0 ? maxAgent[0].sort_order : 0) + 1;

    const { data, error } = await supabase
      .from('ai_agents')
      .insert([{
        name, role, avatar, description, system_prompt, is_active,
        sort_order: nextSortOrder
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

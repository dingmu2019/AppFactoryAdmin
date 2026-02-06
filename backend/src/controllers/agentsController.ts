import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/agents
export const getAgents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch agents (exclude soft deleted)
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch prompt counts (Mocking join with separate query for now, similar to frontend logic but on server)
    // Optimization: In real prod, use a SQL view or join.
    const agentsWithCounts = await Promise.all((agents || []).map(async (agent) => {
      const { count } = await supabase
        .from('agent_prompts')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id);
      return { ...agent, prompts_count: count || 0 };
    }));

    res.json(agentsWithCounts);
  } catch (error: any) {
    next(error);
  }
};

// POST /api/admin/agents
export const createAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, role, avatar, description, system_prompt, is_active } = req.body;
    
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

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    next(error);
  }
};

// PUT /api/admin/agents/:id
export const updateAgent = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { name, role, avatar, description, system_prompt, is_active } = req.body;

    const { data, error } = await supabase
      .from('ai_agents')
      .update({ name, role, avatar, description, system_prompt, is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    next(error);
  }
};

// PATCH /api/admin/agents/:id/status
export const toggleAgentStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    const { data, error } = await supabase
      .from('ai_agents')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    next(error);
  }
};

// DELETE /api/admin/agents/:id
export const deleteAgent = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    // Soft delete
    const { error } = await supabase
      .from('ai_agents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
};

// POST /api/admin/agents/reorder
export const reorderAgents = async (req: Request, res: Response, next: NextFunction) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'IDs must be an array' });
  }

  try {
    const updates = ids.map((id, index) => ({
      id,
      sort_order: index + 1
    }));

    const { error } = await supabase
      .from('ai_agents')
      .upsert(updates);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
};

// GET /api/admin/agents/:id/prompts
export const getAgentPrompts = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('agent_prompts')
      .select('*')
      .eq('agent_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    next(error);
  }
};

// POST /api/admin/agents/:id/prompts (Bulk Upsert)
export const upsertAgentPrompts = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const prompts = req.body; // Array of prompts

  if (!Array.isArray(prompts)) {
    return res.status(400).json({ error: 'Prompts must be an array' });
  }

  try {
    const promptsToUpsert = prompts.map(p => ({
      id: p.id, // If ID exists, it updates; otherwise inserts (if UUID provided or auto-generated by DB? Supabase upsert needs ID usually if updating)
      // Note: If frontend sends ID, we use it. If not, we don't send ID so DB generates it.
      // However, upsert needs a constraint match. PK is usually ID.
      // If we are creating new prompts, we shouldn't send ID unless we generated it.
      // If updating, we must send ID.
      ...(p.id ? { id: p.id } : {}),
      agent_id: id,
      label: p.label,
      content: p.content,
      updated_at: new Date().toISOString()
    }));

    if (promptsToUpsert.length > 0) {
        const { data, error } = await supabase
        .from('agent_prompts')
        .upsert(promptsToUpsert)
        .select();

        if (error) throw error;
        res.json(data);
    } else {
        res.json([]);
    }
  } catch (error: any) {
    next(error);
  }
};

// DELETE /api/admin/agents/:id/prompts/:promptId
export const deleteAgentPrompt = async (req: Request, res: Response, next: NextFunction) => {
  const { promptId } = req.params;
  try {
    const { error } = await supabase
      .from('agent_prompts')
      .delete()
      .eq('id', promptId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
};

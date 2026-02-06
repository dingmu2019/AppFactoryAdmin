import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const getSystemLogs = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const { level, search, app_id, resolved } = req.query;

  let query = supabase
    .from('system_error_logs')
    .select('*', { count: 'exact' });

  // Filters
  if (level) {
    query = query.eq('level', level);
  }
  
  if (app_id) {
    query = query.eq('app_id', app_id);
  }

  if (resolved !== undefined) {
    query = query.eq('resolved', resolved === 'true');
  }

  if (search) {
    query = query.or(`message.ilike.%${search}%,path.ilike.%${search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  });
};

export const resolveLog = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolved } = req.body; // true or false

  const { data, error } = await supabase
    .from('system_error_logs')
    .update({ resolved })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
};

export const getSystemLogStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // Parallel queries for stats
    const [todayCount, unresolvedCount, fatalCount] = await Promise.all([
      // 1. Today's Total
      supabase
        .from('system_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayIso),
      
      // 2. Unresolved Errors
      supabase
        .from('system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false),

      // 3. Fatal Errors (All time or Today? Usually all time unresolved or today's fatal)
      // Let's do Today's Fatal for "Critical Issues"
      supabase
        .from('system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'FATAL')
    ]);

    res.json({
      today_count: todayCount.count || 0,
      unresolved_count: unresolvedCount.count || 0,
      fatal_count: fatalCount.count || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

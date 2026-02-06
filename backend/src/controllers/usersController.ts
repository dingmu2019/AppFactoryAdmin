import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (role) {
      // roles is an array, so we use contains
      query = query.contains('roles', [role]);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      data,
      total: count,
      page,
      pageSize
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { full_name, roles, status } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ full_name, roles, status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If status is updated to 'inactive', we might want to ban the user in auth.users
    // But for now, we rely on the application checking the public.users status.

    res.json(data);
  } catch (error: any) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    // 1. Delete from auth.users (this will cascade to public.users usually, or we do both)
    // Using admin auth client
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) throw authError;

    // 2. Ideally public.users row is deleted via cascade or trigger. 
    // If not, we manually delete it to be safe.
    const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (dbError) console.warn('Failed to delete public user record (might have been cascaded):', dbError.message);

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
};

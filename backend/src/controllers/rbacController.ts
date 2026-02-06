import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Roles ---

export const getRoles = async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('admin_roles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const createRole = async (req: Request, res: Response) => {
  const { name, code, description, is_system } = req.body;
  const { data, error } = await supabase
    .from('admin_roles')
    .insert([{ name, code, description, is_system: is_system || false }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

export const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('admin_roles')
    .delete()
    .eq('id', id)
    .eq('is_system', false); // Prevent deleting system roles

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
};

// --- Permissions ---

export const getPermissions = async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('admin_permissions')
    .select('*')
    .order('category', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const createPermission = async (req: Request, res: Response) => {
  const { code, name, category, description } = req.body;
  
  const { data, error } = await supabase
    .from('admin_permissions')
    .insert([{ code, name, category, description }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

// --- Policies ---

export const getPolicies = async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('admin_policies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const createPolicy = async (req: Request, res: Response) => {
  const { name, resource, action, effect, description } = req.body;
  const { data, error } = await supabase
    .from('admin_policies')
    .insert([{ name, resource, action, effect, description }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

// --- User Assignment ---

export const assignRoleToUser = async (req: Request, res: Response) => {
  const { userId, roleId, appId } = req.body;
  const { error } = await supabase
    .from('admin_user_roles')
    .insert([{ user_id: userId, role_id: roleId, app_id: appId || null }]);

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).send();
};

export const removeRoleFromUser = async (req: Request, res: Response) => {
  const { userId, roleId, appId } = req.body;
  
  let query = supabase
    .from('admin_user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);
    
  if (appId) {
    query = query.eq('app_id', appId);
  } else {
    query = query.is('app_id', null);
  }

  const { error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
};


import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/product-categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/product-categories
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, code, description, sort_order, is_active } = req.body;
    
    const { data, error } = await supabase
      .from('product_categories')
      .insert([{ name, code, description, sort_order, is_active }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/product-categories/:id
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { name, code, description, sort_order, is_active } = req.body;

    const { data, error } = await supabase
      .from('product_categories')
      .update({ name, code, description, sort_order, is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/product-categories/:id
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

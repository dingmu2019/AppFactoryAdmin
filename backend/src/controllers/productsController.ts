
import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/products
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, code),
        app:saas_apps(id, name)
      `)
      .order('created_at', { ascending: false });

    // Simple search/filter
    const { q, category_id, status, app_id } = req.query;
    if (category_id) query = query.eq('category_id', category_id);
    if (status) query = query.eq('status', status);
    if (app_id) query = query.eq('app_id', app_id);
    // Note: 'name' is JSONB, search is tricky. Assuming simple match or relying on frontend filter for now if complex.
    // Or if we stored name as text in a simplified version.
    
    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    next(error);
  }
};

// POST /api/admin/products
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sku, name, type, price, category_id, description, status, images, stock, app_id } = req.body;
    
    // name should be JSONB, e.g., { "zh": "名称" }
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        sku, name, type, price, category_id, description, status, images, stock, app_id
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    next(error);
  }
};

// PUT /api/admin/products/:id
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { sku, name, type, price, category_id, description, status, images, stock, app_id } = req.body;

    const { data, error } = await supabase
      .from('products')
      .update({
        sku, name, type, price, category_id, description, status, images, stock, app_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    next(error);
  }
};

// DELETE /api/admin/products/:id
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
};

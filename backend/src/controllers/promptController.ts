
import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { PromptExtractionService } from '../services/ai/PromptExtractionService.ts';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const getPrompts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = req.query.search as string;
        const tag = req.query.tag as string;
        const categoryId = req.query.categoryId as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        // Try to fetch with join first
        let query = supabase
            .from('programming_prompts')
            .select('*, prompt_categories(name)', { count: 'exact' });

        if (search) {
            // Check if we can search by title, fallback to original_content
            query = query.or(`original_content.ilike.%${search}%,optimized_content.ilike.%${search}%`);
        }

        if (tag) {
            query = query.contains('tags', [tag]);
        }

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        // Fallback if join or columns fail
        if (error && (error.code === 'PGRST200' || error.message.includes('column'))) {
            console.warn('Query failed, falling back to simple query:', error.message);
            let fallbackQuery = supabase
                .from('programming_prompts')
                .select('*', { count: 'exact' });

            if (search) {
                fallbackQuery = fallbackQuery.or(`original_content.ilike.%${search}%,optimized_content.ilike.%${search}%`);
            }
            if (tag) {
                fallbackQuery = fallbackQuery.contains('tags', [tag]);
            }
            
            const fallbackRes = await fallbackQuery
                .order('created_at', { ascending: false })
                .range(from, to);
            
            data = fallbackRes.data;
            count = fallbackRes.count;
            error = fallbackRes.error;
        }

        if (error) throw error;

        res.json({
            data,
            total: count,
            page,
            pageSize,
            totalPages: count ? Math.ceil(count / pageSize) : 0
        });
    } catch (error) {
        next(error);
    }
};

export const createPrompt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, content, original_content, optimized_content, tags, category_id } = req.body;
        const userId = (req as any).user?.id;

        // Manual Creation
        if (original_content) {
            const insertData: any = {
                original_content,
                optimized_content: optimized_content || original_content,
                tags: tags || [],
                user_id: userId
            };
            
            // Only add optional columns if they might exist
            if (title) insertData.title = title;
            if (category_id) insertData.category_id = category_id;

            const { data, error } = await supabase
                .from('programming_prompts')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                // If it fails because of missing columns, try a minimal insert
                if (error.message.includes('column')) {
                    const minimalData = {
                        original_content,
                        optimized_content: optimized_content || original_content,
                        tags: tags || [],
                        user_id: userId
                    };
                    const { data: retryData, error: retryError } = await supabase
                        .from('programming_prompts')
                        .insert(minimalData)
                        .select()
                        .single();
                    if (retryError) throw retryError;
                    return res.json(retryData);
                }
                throw error;
            }
            return res.json(data);
        }

        // AI Extraction (Legacy/Auto)
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const result = await PromptExtractionService.extractAndOptimize(content, userId);
        
        // Update the extracted prompt with category if provided
        if (category_id && (result as any).id) {
            await supabase
                .from('programming_prompts')
                .update({ category_id })
                .eq('id', (result as any).id);
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const updatePrompt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { title, original_content, optimized_content, tags, category_id } = req.body;

        const updateData: any = { original_content, optimized_content, tags };
        if (title) updateData.title = title;
        if (category_id) updateData.category_id = category_id;

        const { data, error } = await supabase
            .from('programming_prompts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            // Fallback for missing columns
            if (error.message.includes('column')) {
                const minimalUpdate = { original_content, optimized_content, tags };
                const { data: retryData, error: retryError } = await supabase
                    .from('programming_prompts')
                    .update(minimalUpdate)
                    .eq('id', id)
                    .select()
                    .single();
                if (retryError) throw retryError;
                return res.json(retryData);
            }
            throw error;
        }
        res.json(data);
    } catch (error) {
        next(error);
    }
};

// --- Category Controllers ---

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { data, error } = await supabase
            .from('prompt_categories')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('relation "public.prompt_categories" does not exist')) {
                console.warn('prompt_categories table missing, returning empty array');
                return res.json([]);
            }
            throw error;
        }
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, code, description, sort_order, is_active } = req.body;
        const userId = (req as any).user?.id;

        const { data, error } = await supabase
            .from('prompt_categories')
            .insert({ name, code, description, sort_order, is_active, user_id: userId })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, code, description, sort_order, is_active } = req.body;

        const { data, error } = await supabase
            .from('prompt_categories')
            .update({ name, code, description, sort_order, is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('prompt_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const deletePrompt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('programming_prompts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const trackUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Atomically increment usage_count and update last_used_at
        const { data, error } = await supabase.rpc('increment_prompt_usage', { p_id: id });

        if (error) {
            // Fallback if RPC doesn't exist yet
            const { data: updated, error: uError } = await supabase
                .from('programming_prompts')
                .select('usage_count')
                .eq('id', id)
                .single();
            
            if (!uError) {
                await supabase
                    .from('programming_prompts')
                    .update({ 
                        usage_count: (updated.usage_count || 0) + 1,
                        last_used_at: new Date().toISOString()
                    })
                    .eq('id', id);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

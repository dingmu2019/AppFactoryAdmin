
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { PromptExtractionService } from '@/services/ai/PromptExtractionService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 12)));
    const search = (searchParams.get('search') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();
    const categoryId = (searchParams.get('categoryId') || '').trim();
    const startDate = (searchParams.get('startDate') || '').trim();
    const endDate = (searchParams.get('endDate') || '').trim();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('programming_prompts')
      .select('*, prompt_categories(name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(
        [
          `title.ilike.%${escaped}%`,
          `original_content.ilike.%${escaped}%`,
          `optimized_content.ilike.%${escaped}%`,
        ].join(',')
      );
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

    const { data, error, count } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      data: data || [],
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, original_content, optimized_content, tags, category_id, content } = body || {};

    const auth = req.headers.get('authorization') || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = userData.user.id;

    if (typeof content === 'string' && content.trim()) {
      const result = await PromptExtractionService.extractAndOptimize(content.trim(), userId, category_id);
      return NextResponse.json(result, { status: 201 });
    }

    if (typeof original_content !== 'string' || !original_content.trim()) {
      return NextResponse.json({ error: 'original_content is required' }, { status: 400 });
    }

    const tagsArray: string[] = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    const insertData: any = {
      title: typeof title === 'string' ? title : undefined,
      original_content: original_content.trim(),
      optimized_content: typeof optimized_content === 'string' && optimized_content.trim() ? optimized_content.trim() : original_content.trim(),
      tags: tagsArray,
      category_id: typeof category_id === 'string' && category_id ? category_id : undefined,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('programming_prompts')
      .insert(insertData)
      .select('*, prompt_categories(name)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

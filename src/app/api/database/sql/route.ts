
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient, closeDatabaseClient } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sql } = body;

    if (!sql) {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }

    // Verify Admin Access
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
    
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: Check if user has 'admin' role in public.users or metadata
    // For now, we assume middleware or RBAC handles this, but explicit check is safer for raw SQL.
    const { data: userData } = await supabase
        .from('users')
        .select('roles')
        .eq('id', user.id)
        .single();
    
    const isAdmin = userData?.roles?.includes('admin') || user.user_metadata?.role === 'admin';
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let client;
    try {
      client = await getDatabaseClient();
      const result = await client.query(sql);
      return NextResponse.json(result.rows || []);
    } finally {
      await closeDatabaseClient(client);
    }
  } catch (error: any) {
    console.error('SQL Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

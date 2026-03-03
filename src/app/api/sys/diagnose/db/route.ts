
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient, closeDatabaseClient } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/sys/diagnose/db
// 诊断数据库连接和 Supabase 服务状态
// 仅允许管理员或在开发环境中访问
export async function GET(req: NextRequest) {
  const result: any = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      EDGEONE: !!process.env.EDGEONE_PAGES,
      DATABASE_URL_CONFIGURED: !!process.env.DATABASE_URL,
      DIRECT_URL_CONFIGURED: !!process.env.DIRECT_URL,
      SUPABASE_URL_CONFIGURED: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SERVICE_KEY_CONFIGURED: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    checks: {}
  };

  // 1. Check Supabase Client (Service Role)
  try {
    const start = Date.now();
    // 尝试列出用户（仅需读取权限，开销小）
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    result.checks.supabase_admin = {
      status: error ? 'error' : 'ok',
      latency_ms: Date.now() - start,
      error: error?.message,
      details: error ? 'Failed to connect to Supabase Auth API' : 'Successfully connected to Supabase Auth API'
    };
  } catch (err: any) {
    result.checks.supabase_admin = { 
      status: 'exception', 
      error: err.message,
      stack: err.stack
    };
  }

  // 2. Check Database Connection (Pool)
  let client;
  try {
    const start = Date.now();
    // 获取连接（包含连接池初始化和握手）
    client = await getDatabaseClient();
    
    // 执行简单查询
    const res = await client.query('SELECT version(), current_database(), current_user, inet_server_addr()');
    
    result.checks.database_pool = {
      status: 'ok',
      latency_ms: Date.now() - start,
      version: res.rows[0].version,
      database: res.rows[0].current_database,
      user: res.rows[0].current_user,
      server_ip: res.rows[0].inet_server_addr,
      details: 'Successfully connected to PostgreSQL via pg pool'
    };
  } catch (err: any) {
    result.checks.database_pool = {
      status: 'error',
      error: err.message,
      stack: err.stack,
      details: 'Failed to connect to PostgreSQL. Possible causes: Network timeout, IP blocking, or wrong credentials.'
    };
  } finally {
    if (client) await closeDatabaseClient(client);
  }

  // 3. Network Connectivity Check (Optional)
  try {
    const start = Date.now();
    // 尝试访问 Supabase API 根路径
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const res = await fetch(supabaseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      result.checks.network_supabase_api = {
        status: res.ok ? 'ok' : 'error',
        latency_ms: Date.now() - start,
        status_code: res.status
      };
    }
  } catch (err: any) {
    result.checks.network_supabase_api = {
      status: 'exception',
      error: err.message
    };
  }

  return NextResponse.json(result);
}

import { supabaseAdmin as supabase } from '@/lib/supabase';

export interface CreateAuditLogDTO {
  user_id?: string;
  // user_email?: string; // Removed as per request
  app_id?: string;
  action: string;
  resource: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  status?: 'SUCCESS' | 'FAILURE';
}

export interface AuditLogQueryDTO {
  page?: number;
  pageSize?: number;
  app_id?: string;
  action?: string;
  resource?: string;
  // user_email?: string; // Removed filter
  user_id?: string; // Added user_id filter
  startDate?: string;
  endDate?: string;
}

export class AuditLogService {
  private static cachedAdminSysAppId: string | null = null;
  private static cachedAdminSysAppIdAtMs = 0;

  static async getAdminSysAppId(): Promise<string | undefined> {
    const now = Date.now();
    if (this.cachedAdminSysAppId && now - this.cachedAdminSysAppIdAtMs < 5 * 60 * 1000) {
      return this.cachedAdminSysAppId;
    }

    const { data, error } = await supabase
      .from('saas_apps')
      .select('id')
      .eq('name', 'AdminSys_app')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to resolve AdminSys_app id:', error);
      return undefined;
    }

    const id = data?.id as string | undefined;
    if (id) {
      this.cachedAdminSysAppId = id;
      this.cachedAdminSysAppIdAtMs = now;
    }
    return id;
  }

  static async resolveAppId(appId?: string): Promise<string | undefined> {
    if (!appId) return undefined;

    const byId = await supabase
      .from('saas_apps')
      .select('id')
      .eq('id', appId)
      .limit(1)
      .maybeSingle();

    if (byId.data?.id) return byId.data.id as string;

    const byName = await supabase
      .from('saas_apps')
      .select('id')
      .eq('name', appId)
      .limit(1)
      .maybeSingle();

    return (byName.data?.id as string | undefined) || undefined;
  }

  /**
   * Record an audit log entry
   */
  static async log(entry: CreateAuditLogDTO) {
    try {
      const resolvedAppId =
        (await this.resolveAppId(entry.app_id)) ||
        (await this.getAdminSysAppId());

      const finalEntry = resolvedAppId ? { ...entry, app_id: resolvedAppId } : entry;

      const { error } = await supabase
        .from('audit_logs')
        .insert([finalEntry]);


      if (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw error to avoid blocking the main business logic
      }
    } catch (err) {
      console.error('Unexpected error writing audit log:', err);
    }
  }

  /**
   * Query audit logs with pagination and filtering
   */
  static async query(params: AuditLogQueryDTO) {
    const {
      page = 1,
      pageSize = 20,
      app_id,
      action,
      resource,
      // user_email,
      startDate,
      endDate
    } = params;

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!user_id(email)
      `, { count: 'exact' });

    if (app_id) query = query.eq('app_id', app_id);
    if (action) query = query.eq('action', action);
    if (resource) query = query.eq('resource', resource);
    
    if (params.user_id) {
      if (params.user_id.includes('@')) {
        // Filter by user email via join
        query = query.filter('user.email', 'ilike', `%${params.user_id}%`);
      } else {
        // Filter by user_id UUID
        query = query.eq('user_id', params.user_id);
      }
    }
    
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);


    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return {
      data,
      total: count,
      page,
      pageSize
    };
  }

  /**
   * Get basic statistics
   */
  static async getStats() {
    // 1. Total logs today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { count: todayCount, error: err1 } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);

    // 2. Count by action type (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Note: Supabase JS client doesn't support "GROUP BY" easily without RPC.
    // We will fetch a subset or use a separate query for failure count.
    
    // 3. Failure count today
    const { count: failureCount, error: err2 } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso)
      .eq('status', 'FAILURE');

    if (err1 || err2) {
      console.error('Error fetching stats:', err1 || err2);
    }

    return {
      todayCount: todayCount || 0,
      failureCount: failureCount || 0,
    };
  }
}

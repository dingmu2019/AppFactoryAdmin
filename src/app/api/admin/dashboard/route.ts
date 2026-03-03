
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { withApiErrorHandling } from '@/lib/api-wrapper';

type Trend = 'up' | 'down' | 'neutral';

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfMonth = (d: Date) => {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addMonths = (d: Date, months: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

const percentChange = (current: number, previous: number) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const trendFromPct = (pct: number): Trend => {
  if (pct > 0.1) return 'up';
  if (pct < -0.1) return 'down';
  return 'neutral';
};

const iso = (d: Date) => d.toISOString();

const compactDate = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
};

const monthLabel = (d: Date) => d.toLocaleString('en-US', { month: 'short' });

const safeText = (v: any) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

export const GET = withApiErrorHandling(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const range = String(searchParams.get('range') || 'last12Months');
    const now = new Date();

    const thisMonthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(addMonths(now, -1));
    const prevMonthEnd = new Date(thisMonthStart.getTime() - 1);

    const last30Start = startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const prev30Start = startOfDay(new Date(last30Start.getTime() - 30 * 24 * 60 * 60 * 1000));
    const prev30End = new Date(last30Start.getTime() - 1);

    const [paidThisMonth, paidPrevMonth, auditLast30, auditPrev30, activeAppsCount, totalUsersCount, activeUsers30, activeUsersPrev30] =
      await Promise.all([
        supabase.from('orders').select('pay_amount').eq('status', 'paid').gte('created_at', iso(thisMonthStart)),
        supabase.from('orders').select('pay_amount').eq('status', 'paid').gte('created_at', iso(prevMonthStart)).lte('created_at', iso(prevMonthEnd)),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', iso(last30Start)),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', iso(prev30Start)).lte('created_at', iso(prev30End)),
        supabase.from('saas_apps').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('user_app_relations').select('*', { count: 'exact', head: true }).gte('last_active_at', iso(last30Start)),
        supabase.from('user_app_relations').select('*', { count: 'exact', head: true }).gte('last_active_at', iso(prev30Start)).lte('last_active_at', iso(prev30End))
      ]);

    const thisMonthRevenue = (paidThisMonth.data || []).reduce((sum: number, o: any) => sum + (Number(o.pay_amount) || 0), 0);
    const prevMonthRevenue = (paidPrevMonth.data || []).reduce((sum: number, o: any) => sum + (Number(o.pay_amount) || 0), 0);
    const revenuePct = percentChange(thisMonthRevenue, prevMonthRevenue);

    const apiLast30 = auditLast30.count || 0;
    const apiPrev30 = auditPrev30.count || 0;
    const apiPct = percentChange(apiLast30, apiPrev30);

    const users30 = activeUsers30.count || 0;
    const usersPrev = activeUsersPrev30.count || 0;
    const userBase = users30 > 0 ? users30 : (totalUsersCount.count || 0);
    const userPct = users30 > 0 ? percentChange(users30, usersPrev) : 0;

    const appsCount = activeAppsCount.count || 0;

    let seriesStart: Date;
    let seriesBuckets: { key: string; label: string; start: Date; end: Date }[] = [];

    if (range === 'last7Days') {
      const start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
      seriesStart = start;
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        seriesBuckets.push({
          key: iso(dayStart).slice(0, 10),
          label: dayStart.toLocaleString('en-US', { weekday: 'short' }),
          start: dayStart,
          end: dayEnd
        });
      }
    } else if (range === 'last30Days') {
      const start = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
      seriesStart = start;
      for (let i = 0; i < 30; i++) {
        const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        seriesBuckets.push({
          key: iso(dayStart).slice(0, 10),
          label: compactDate(dayStart),
          start: dayStart,
          end: dayEnd
        });
      }
    } else {
      const start = startOfMonth(addMonths(now, -11));
      seriesStart = start;
      for (let i = 0; i < 12; i++) {
        const mStart = startOfMonth(addMonths(start, i));
        const mEnd = new Date(startOfMonth(addMonths(mStart, 1)).getTime() - 1);
        seriesBuckets.push({
          key: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}`,
          label: monthLabel(mStart),
          start: mStart,
          end: mEnd
        });
      }
    }

    const { data: paidSeriesOrders, error: seriesError } = await supabase
      .from('orders')
      .select('created_at, pay_amount')
      .eq('status', 'paid')
      .gte('created_at', iso(seriesStart));

    if (seriesError) throw seriesError;

    const bucketSums = new Map<string, number>();
    seriesBuckets.forEach(b => bucketSums.set(b.key, 0));

    (paidSeriesOrders || []).forEach((o: any) => {
      const created = new Date(o.created_at);
      const amount = Number(o.pay_amount) || 0;

      for (const b of seriesBuckets) {
        if (created >= b.start && created <= b.end) {
          bucketSums.set(b.key, (bucketSums.get(b.key) || 0) + amount);
          break;
        }
      }
    });

    const revenueSeries = seriesBuckets.map(b => ({
      name: b.label,
      value: Number((bucketSums.get(b.key) || 0).toFixed(2))
    }));

    const [{ data: auditRecent }, { data: sysRecent }] = await Promise.all([
      supabase.from('audit_logs').select('id, action, resource, status, created_at, details').order('created_at', { ascending: false }).limit(6),
      supabase.from('system_error_logs').select('id, level, message, created_at, path').order('created_at', { ascending: false }).limit(6)
    ]);

    const notesRaw: { id: string; type: 'success' | 'warning' | 'info'; title: string; message: string; created_at: string }[] = [];

    (auditRecent || []).forEach((a: any) => {
      const isFailure = String(a.status).toUpperCase() === 'FAILURE';
      notesRaw.push({
        id: a.id,
        type: isFailure ? 'warning' : 'success',
        title: `${a.action} ${a.resource}`,
        message: safeText(a.details?.error || a.details?.message || a.details?.path || a.details),
        created_at: a.created_at
      });
    });

    (sysRecent || []).forEach((s: any) => {
      const lvl = String(s.level || '').toUpperCase();
      notesRaw.push({
        id: s.id,
        type: lvl === 'FATAL' ? 'warning' : 'info',
        title: lvl ? `System ${lvl}` : 'System Log',
        message: safeText(s.message || s.path || ''),
        created_at: s.created_at
      });
    });

    notesRaw.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const notifications = notesRaw.slice(0, 8).map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message.slice(0, 120),
      date: new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: '2-digit' })
    }));

    return NextResponse.json({
      range,
      cards: {
        totalRevenue: { value: thisMonthRevenue, changePct: revenuePct, trend: trendFromPct(revenuePct) },
        activeUsers: { value: userBase, changePct: userPct, trend: trendFromPct(userPct) },
        apiRequests: { value: apiLast30, changePct: apiPct, trend: trendFromPct(apiPct) },
        activeApps: { value: appsCount, changePct: 0, trend: 'neutral' as Trend }
      },
      revenueSeries,
      notifications
    });
});

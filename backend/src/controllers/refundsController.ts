import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const getRefundList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const refundNo = (req.query.refundNo as string) || '';
    const orderNo = (req.query.orderNo as string) || '';
    const status = (req.query.status as string) || '';
    const type = (req.query.type as string) || '';

    let orderIds: string[] | null = null;
    if (orderNo) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .ilike('order_no', `%${orderNo}%`)
        .limit(500);

      if (ordersError) throw ordersError;
      orderIds = (ordersData || []).map((o: any) => o.id);
      if (orderIds.length === 0) {
        return res.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
      }
    }

    let query = supabase
      .from('refunds')
      .select(
        `
        *,
        order:orders(
          id,
          order_no,
          pay_amount,
          currency,
          status,
          created_at,
          saas_apps(name),
          users(email, full_name)
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (refundNo) {
      query = query.ilike('refund_no', `%${refundNo}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (orderIds) {
      query = query.in('order_id', orderIds);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return res.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

export const getRefundStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: todayCount, error: todayCountError } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);
    if (todayCountError) throw todayCountError;

    const { data: todayAmountRows, error: todayAmountError } = await supabase
      .from('refunds')
      .select('amount')
      .gte('created_at', todayISO)
      .eq('status', 'success');
    if (todayAmountError) throw todayAmountError;
    const todayAmount = (todayAmountRows || []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

    const { count: totalCount, error: totalCountError } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true });
    if (totalCountError) throw totalCountError;

    return res.json({
      todayCount: todayCount || 0,
      todayAmount: todayAmount || 0,
      totalCount: totalCount || 0
    });
  } catch (error) {
    next(error);
  }
};


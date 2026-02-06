import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { OrderService } from '../services/OrderService.ts';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const orderNo = req.query.orderNo as string;
    const status = req.query.status as string;
    const appId = req.query.appId as string;

    // Use query builder
    let query = supabase
      .from('orders')
      .select('*, saas_apps(name), users(email, full_name)', { count: 'exact' });

    if (orderNo) {
      query = query.ilike('order_no', `%${orderNo}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }
    
    if (appId) {
      query = query.eq('source_app_id', appId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Calculate total pages
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    res.json({
      data,
      total: count,
      page,
      pageSize,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

export const getRefunds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = req.params.orderId as string;
    const { amount, reason, type, revokeBenefits = false } = req.body;
    
    // 1. Validate Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('pay_amount, status')
        .eq('id', orderId)
        .single();
    
    if (orderError || !order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow refunds for paid/completed orders
    if (!['paid', 'completed', 'shipped'].includes(order.status)) {
        return res.status(400).json({ error: `Cannot refund order with status: ${order.status}` });
    }

    // 2. Check Refundable Amount
    const { data: existingRefunds, error: refundError } = await supabase
        .from('refunds')
        .select('amount')
        .eq('order_id', orderId)
        .neq('status', 'failed'); // Exclude failed refunds
    
    if (refundError) throw refundError;

    const refundedAmount = existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const requestAmount = Number(amount);
    
    if (isNaN(requestAmount) || requestAmount <= 0) {
        return res.status(400).json({ error: 'Invalid refund amount' });
    }

    if (refundedAmount + requestAmount > order.pay_amount) {
        return res.status(400).json({ 
            error: `Refund amount exceeds refundable balance. Max refundable: ${(order.pay_amount - refundedAmount).toFixed(2)}` 
        });
    }

    // 3. Create Refund Record
    const refundNo = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { data, error } = await supabase
      .from('refunds')
      .insert({
        order_id: orderId,
        refund_no: refundNo,
        amount: requestAmount,
        reason,
        type,
        status: 'success', // Auto success for demo
        created_by: (req as any).user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Trigger Benefit Reclamation and Order Status Update via OrderService
    await OrderService.handleRefund(orderId, data.id, requestAmount, revokeBenefits);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getOrderStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Convert to UTC ISO string but keep local day logic if needed. 
    // Usually 'created_at' is UTC. So 'todayISO' should be start of today in UTC or adjust for timezone.
    // For simplicity, let's assume server time UTC matches.
    const todayISO = today.toISOString();

    // 1. Today's Order Count
    const { count: todayCount, error: todayCountError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    if (todayCountError) throw todayCountError;

    // 2. Today's Revenue (All paid orders created today)
    const { data: todayRevenueData, error: todayRevenueError } = await supabase
      .from('orders')
      .select('pay_amount')
      .gte('created_at', todayISO)
      .or('status.eq.paid,status.eq.completed,status.eq.shipped'); // Include other 'paid-like' statuses
    
    if (todayRevenueError) throw todayRevenueError;
    const todayAmount = todayRevenueData?.reduce((sum, order) => sum + (order.pay_amount || 0), 0) || 0;

    // 3. Total Order Count
    const { count: totalCount, error: totalCountError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (totalCountError) throw totalCountError;

    res.json({
      todayCount: todayCount || 0,
      todayAmount: todayAmount || 0,
      totalCount: totalCount || 0
    });
  } catch (error) {
    next(error);
  }
};

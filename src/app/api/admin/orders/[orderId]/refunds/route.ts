
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { OrderService } from '@/services/orderService.backend';

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const body = await req.json();
    const { amount, reason, type, revokeBenefits = false } = body;
    
    // 1. Validate Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('pay_amount, status')
        .eq('id', orderId)
        .single();
    
    if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow refunds for paid/completed orders
    if (!['paid', 'completed', 'shipped'].includes(order.status)) {
        return NextResponse.json({ error: `Cannot refund order with status: ${order.status}` }, { status: 400 });
    }

    // 2. Check Refundable Amount
    const { data: existingRefunds, error: refundError } = await supabase
        .from('refunds')
        .select('amount')
        .eq('order_id', orderId)
        .neq('status', 'failed'); // Exclude failed refunds
    
    if (refundError) return NextResponse.json({ error: refundError.message }, { status: 500 });

    const refundedAmount = existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const requestAmount = Number(amount);
    
    if (isNaN(requestAmount) || requestAmount <= 0) {
        return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 });
    }

    if (refundedAmount + requestAmount > order.pay_amount) {
        return NextResponse.json({ 
            error: `Refund amount exceeds refundable balance. Max refundable: ${(order.pay_amount - refundedAmount).toFixed(2)}` 
        }, { status: 400 });
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
        // created_by: req.user?.id // Middleware auth needed
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 4. Trigger Benefit Reclamation and Order Status Update via OrderService
    await OrderService.handleRefund(orderId, data.id, requestAmount, revokeBenefits);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

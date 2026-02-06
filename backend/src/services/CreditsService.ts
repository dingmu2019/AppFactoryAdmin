import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class CreditsService {
  static async topupFromPaidOrder(orderId: string) {
    const { data, error } = await supabase.rpc('ai_credits_topup_from_order', { p_order_id: orderId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), creditsGranted: Number(row?.credits_granted || 0) };
  }

  static async revokeFromRefund(orderId: string, refundId: string, revokeRatio: number = 1.0) {
    const { data, error } = await supabase.rpc('ai_credits_revoke_from_order', { 
        p_order_id: orderId,
        p_refund_id: refundId,
        p_revoke_ratio: revokeRatio
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), creditsRevoked: Number(row?.credits_revoked || 0) };
  }
}


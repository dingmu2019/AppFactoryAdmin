import { authenticatedFetch } from '../lib/http';

const API_BASE = '/api/admin/refunds';

export interface RefundItem {
  id: string;
  refund_no: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | string;
  type: 'full' | 'partial' | string;
  reason?: string;
  refund_channel?: string;
  transaction_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    order_no: string;
    pay_amount: number;
    currency?: string;
    status?: string;
    created_at?: string;
    saas_apps?: { name: string };
    users?: { email: string; full_name: string };
  };
}

export interface RefundListResponse {
  data: RefundItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const fetchRefunds = async (params: {
  page: number;
  pageSize: number;
  refundNo?: string;
  orderNo?: string;
  status?: string;
  type?: string;
}): Promise<RefundListResponse> => {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
    ...(params.refundNo && { refundNo: params.refundNo }),
    ...(params.orderNo && { orderNo: params.orderNo }),
    ...(params.status && { status: params.status }),
    ...(params.type && { type: params.type })
  });

  const res = await authenticatedFetch(`${API_BASE}?${queryParams}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Failed to fetch refunds');
  }
  return await res.json();
};

export const fetchRefundStats = async (): Promise<{ todayCount: number; todayAmount: number; totalCount: number }> => {
  const res = await authenticatedFetch(`${API_BASE}/stats`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Failed to fetch refund stats');
  }
  return await res.json();
};


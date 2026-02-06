import { authenticatedFetch } from '../lib/http';

const API_BASE = '/api/admin/orders';

export interface Order {
  id: string;
  order_no: string;
  source_app_id: string;
  user_id: string;
  pay_amount: number;
  currency?: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  payment_channel?: string;
  transaction_id?: string;
  client_ip?: string;
  order_type?: string;
  plan_key?: string;
  billing_cycle?: string;
  subscription_id?: string;
  provision_status?: string;
  items_snapshot: any;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
  };
  saas_apps?: {
    name: string;
  };
}

export interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const fetchOrders = async (params: {
  page: number;
  pageSize: number;
  orderNo?: string;
  status?: string;
  appId?: string;
}): Promise<OrderListResponse> => {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
    ...(params.orderNo && { orderNo: params.orderNo }),
    ...(params.status && { status: params.status }),
    ...(params.appId && { appId: params.appId }),
  });

  const res = await authenticatedFetch(`${API_BASE}?${queryParams}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch orders: ${res.statusText}`);
  }
  return await res.json();
};

export const fetchRefunds = async (orderId: string) => {
  const res = await authenticatedFetch(`${API_BASE}/${orderId}/refunds`);
  if (!res.ok) throw new Error('Failed to fetch refunds');
  return await res.json();
};

export const createRefund = async (orderId: string, data: { amount: number; reason: string; type: string; revokeBenefits?: boolean }) => {
  const res = await authenticatedFetch(`${API_BASE}/${orderId}/refunds`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create refund');
  return await res.json();
};

export const fetchOrderStats = async (): Promise<{ todayCount: number; todayAmount: number; totalCount: number }> => {
  const res = await authenticatedFetch(`${API_BASE}/stats`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Failed to fetch order stats');
  }
  return await res.json();
};

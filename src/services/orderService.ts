
import { authenticatedFetch } from '@/lib/http';

export interface Order {
  id: string;
  order_no: string;
  pay_amount: number;
  status: string;
  created_at: string;
  saas_apps?: { name: string };
  users?: { email: string; full_name: string };
  provision_status?: string;
  currency?: string;
  payment_channel?: string;
  plan_key?: string;
  client_ip?: string;
  items_snapshot?: any;
  source_app_id?: string;
  transaction_id?: string;
}

export const fetchOrders = async (params: any) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.orderNo) searchParams.set('orderNo', params.orderNo);
  if (params.status) searchParams.set('status', params.status);
  if (params.appId) searchParams.set('appId', params.appId);

  const res = await authenticatedFetch(`/api/admin/orders?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
};

export const fetchRefunds = async (orderId: string) => {
  const res = await authenticatedFetch(`/api/admin/orders/${orderId}/refunds`);
  if (!res.ok) throw new Error('Failed to fetch refunds');
  return res.json();
};

export const createRefund = async (orderId: string, data: any) => {
  const res = await authenticatedFetch(`/api/admin/orders/${orderId}/refunds`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create refund');
  return res.json();
};

export const fetchOrderStats = async () => {
  const res = await authenticatedFetch('/api/admin/orders/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

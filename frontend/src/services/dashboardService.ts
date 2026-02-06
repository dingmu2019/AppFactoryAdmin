import { authenticatedFetch } from '../lib/http';

export type DashboardRange = 'last12Months' | 'last30Days' | 'last7Days';
export type DashboardTrend = 'up' | 'down' | 'neutral';

export interface DashboardCard {
  value: number;
  changePct: number;
  trend: DashboardTrend;
}

export interface DashboardNotification {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  date: string;
}

export interface DashboardOverviewResponse {
  range: DashboardRange;
  cards: {
    totalRevenue: DashboardCard;
    activeUsers: DashboardCard;
    apiRequests: DashboardCard;
    activeApps: DashboardCard;
  };
  revenueSeries: { name: string; value: number }[];
  notifications: DashboardNotification[];
}

export const fetchDashboardOverview = async (range: DashboardRange): Promise<DashboardOverviewResponse> => {
  const res = await authenticatedFetch(`/api/admin/dashboard/overview?range=${encodeURIComponent(range)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to fetch dashboard overview');
  }
  return data as DashboardOverviewResponse;
};


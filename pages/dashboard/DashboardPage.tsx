
import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, Activity, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { useI18n, useTheme } from '../../contexts';
import { supabase } from '../../lib/supabase';

type DashboardRange = 'last12Months' | 'last30Days' | 'last7Days';
type DashboardTrend = 'up' | 'down' | 'neutral';

interface DashboardCard {
  value: number;
  changePct: number;
  trend: DashboardTrend;
}

interface DashboardNotification {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  date: string;
}

interface DashboardOverviewResponse {
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

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 transition-all duration-300 hover:shadow-md dark:hover:shadow-glow hover:-translate-y-1 group">
    <div className="flex items-start justify-between mb-6">
      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
        <Icon className="text-indigo-600 dark:text-indigo-400" size={24} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
        trend === 'up' 
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
            : trend === 'neutral'
                ? 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
      }`}>
        {change}
        {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : null}
      </div>
    </div>
    <div className="space-y-1">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wide uppercase">{title}</h3>
        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const [range, setRange] = useState<DashboardRange>('last12Months');
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState<DashboardOverviewResponse['cards']>({
    totalRevenue: { value: 0, changePct: 0, trend: 'neutral' },
    activeUsers: { value: 0, changePct: 0, trend: 'neutral' },
    apiRequests: { value: 0, changePct: 0, trend: 'neutral' },
    activeApps: { value: 0, changePct: 0, trend: 'neutral' }
  });
  const [revenueSeries, setRevenueSeries] = useState<{ name: string; value: number }[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/admin/dashboard/overview?range=${encodeURIComponent(range)}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to fetch dashboard overview');
        }
        setCards(data.cards);
        setRevenueSeries(data.revenueSeries || []);
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error('Failed to load dashboard overview:', err);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [range]);

  const formatPct = (pct: number) => {
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  const formatNumber = (n: number) => {
    const v = Number(n) || 0;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return `${v}`;
  };

  const formatCurrency = (amount: number) => {
    const v = Number(amount) || 0;
    return `¥${v.toFixed(2)}`;
  };

  const yTickFormatter = useMemo(() => {
    return (value: number) => `¥${value}`;
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('dashboard.totalRevenue')}
          value={formatCurrency(cards.totalRevenue.value)} 
          change={formatPct(cards.totalRevenue.changePct)} 
          trend={cards.totalRevenue.trend}
          icon={DollarSign} 
        />
        <StatCard 
          title={t('dashboard.activeUsers')}
          value={formatNumber(cards.activeUsers.value)} 
          change={formatPct(cards.activeUsers.changePct)} 
          trend={cards.activeUsers.trend}
          icon={Users} 
        />
        <StatCard 
          title={t('dashboard.apiRequests')}
          value={formatNumber(cards.apiRequests.value)} 
          change={formatPct(cards.apiRequests.changePct)} 
          trend={cards.apiRequests.trend}
          icon={Activity} 
        />
        <StatCard 
          title={t('dashboard.activeApps')}
          value={formatNumber(cards.activeApps.value)} 
          change={formatPct(cards.activeApps.changePct)} 
          trend={cards.activeApps.trend}
          icon={Layers} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 transition-colors duration-200 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dashboard.revenueOverview')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Platform-wide earnings performance</p>
            </div>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as DashboardRange)}
              className="text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none transition-shadow font-medium"
            >
              <option value="last12Months">{t('dashboard.last12Months')}</option>
              <option value="last30Days">{t('dashboard.last30Days')}</option>
              <option value="last7Days">{t('dashboard.last7Days')}</option>
            </select>
          </div>
          <div className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} 
                  tickFormatter={yTickFormatter}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(8px)',
                    color: isDark ? '#fff' : '#000',
                    padding: '12px'
                  }}
                  itemStyle={{
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontWeight: 600
                  }}
                  cursor={{stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '4 4'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notifications / Activity */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 flex flex-col transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dashboard.systemActivity')}</h3>
             <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          </div>
          
          <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {notifications.map((note, index) => (
              <div key={note.id} className="relative pl-6 pb-2 group">
                 {/* Timeline Line */}
                 {index !== notifications.length - 1 && (
                     <div className="absolute left-[5px] top-2 bottom-[-24px] w-px bg-slate-200 dark:bg-slate-800 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900 transition-colors"></div>
                 )}
                 <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                  note.type === 'success' ? 'bg-emerald-500' :
                  note.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200">{note.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{note.message}</p>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mt-2 block">{note.date}</span>
                </div>
              </div>
            ))}
            {!isLoading && notifications.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400">No activity</div>
            )}
          </div>
          <button className="mt-6 w-full py-2.5 text-sm text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition-all active:scale-[0.98]">
            {t('dashboard.viewLogs')}
          </button>
        </div>
      </div>
    </div>
  );
};

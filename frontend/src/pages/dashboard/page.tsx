import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Layers
} from 'lucide-react';
import { useI18n, useTheme } from '../../contexts';
import { fetchDashboardOverview } from '../../services/dashboardService';
import type { DashboardNotification, DashboardOverviewResponse, DashboardRange, DashboardTrend } from '../../services/dashboardService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
};

const StatCard = ({ title, value, change, trend, icon: Icon }: any) => (
  <motion.div 
    variants={itemVariants as any}
    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.98 }}
    className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group cursor-default"
  >
    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
        <Icon size={100} className="text-indigo-600 dark:text-indigo-400" />
    </div>
    <div className="flex items-center justify-between mb-8 relative z-10">
      <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors backdrop-blur-sm">
        <Icon className="text-indigo-600 dark:text-indigo-400" size={26} strokeWidth={1.5} />
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md ${
        trend === 'up' 
            ? 'bg-emerald-50/80 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
            : trend === 'neutral'
                ? 'bg-slate-50/80 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'
                : 'bg-rose-50/80 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
      }`}>
        {change}
        {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : null}
      </div>
    </div>
    <div className="space-y-2 relative z-10">
        <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-widest uppercase opacity-80">{title}</h3>
        <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">{value}</p>
    </div>
  </motion.div>
);

export const DashboardPage: React.FC = () => {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const [range, setRange] = useState<DashboardRange>('last12Months');
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState<DashboardOverviewResponse['cards']>({
    totalRevenue: { value: 0, changePct: 0, trend: 'neutral' as DashboardTrend },
    activeUsers: { value: 0, changePct: 0, trend: 'neutral' as DashboardTrend },
    apiRequests: { value: 0, changePct: 0, trend: 'neutral' as DashboardTrend },
    activeApps: { value: 0, changePct: 0, trend: 'neutral' as DashboardTrend }
  });
  const [revenueSeries, setRevenueSeries] = useState<{ name: string; value: number }[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDashboardOverview(range);
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
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
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
        <motion.div 
          variants={itemVariants as any}
          className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200 flex flex-col relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dashboard.revenueOverview')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Platform-wide earnings performance</p>
            </div>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as DashboardRange)}
              className="text-sm border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none transition-shadow font-semibold backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <option value="last12Months">{t('dashboard.last12Months')}</option>
              <option value="last30Days">{t('dashboard.last30Days')}</option>
              <option value="last7Days">{t('dashboard.last7Days')}</option>
            </select>
          </div>
          <div className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                  filter="drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Notifications / Activity */}
        <motion.div 
          variants={itemVariants as any}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors duration-200"
        >
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dashboard.systemActivity')}</h3>
             <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          </div>
          
          <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
            {notifications.map((note, index) => (
              <div key={note.id} className="relative pl-8 pb-2 group">
                 {/* Timeline Line */}
                 {index !== notifications.length - 1 && (
                     <div className="absolute left-[7px] top-3 bottom-[-32px] w-[2px] bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors rounded-full"></div>
                 )}
                 <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10 transition-transform group-hover:scale-110 ${
                  note.type === 'success' ? 'bg-emerald-500 shadow-emerald-200 dark:shadow-emerald-900/20' :
                  note.type === 'warning' ? 'bg-amber-500 shadow-amber-200 dark:shadow-amber-900/20' : 'bg-indigo-500 shadow-indigo-200 dark:shadow-indigo-900/20'
                }`} />
                
                <div className="group-hover:translate-x-1 transition-transform duration-300">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">{note.date}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{note.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%]">{note.message}</p>
                </div>
              </div>
            ))}
            {!isLoading && notifications.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400 italic">No recent activity</div>
            )}
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-8 w-full py-3 text-sm text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all"
          >
            {t('dashboard.viewLogs')}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;

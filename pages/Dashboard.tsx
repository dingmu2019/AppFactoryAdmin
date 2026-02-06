import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { REVENUE_DATA, NOTIFICATIONS } from '../constants';
import { useI18n, useTheme } from '../contexts';

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <Icon className="text-slate-600 dark:text-slate-300" size={24} />
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {change}
        {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      </div>
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
  </div>
);

export const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { isDark } = useTheme();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('dashboard.totalRevenue')}
          value="$9,740.00" 
          change="+12.5%" 
          trend="up"
          icon={DollarSign} 
        />
        <StatCard 
          title={t('dashboard.activeUsers')}
          value="12,912" 
          change="+8.1%" 
          trend="up"
          icon={Users} 
        />
        <StatCard 
          title={t('dashboard.apiRequests')}
          value="1.2M" 
          change="+22.4%" 
          trend="up"
          icon={Activity} 
        />
        <StatCard 
          title={t('dashboard.activeApps')}
          value="3" 
          change="0.0%" 
          trend="neutral"
          icon={Activity} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.revenueOverview')}</h3>
            <select className="text-sm border-none bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-1 text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none">
              <option>{t('dashboard.last12Months')}</option>
              <option>{t('dashboard.last30Days')}</option>
              <option>{t('dashboard.last7Days')}</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12}} 
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: isDark ? '#fff' : '#000'
                  }}
                  itemStyle={{
                      color: isDark ? '#e2e8f0' : '#1e293b'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notifications / Activity */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors duration-200">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('dashboard.systemActivity')}</h3>
          <div className="flex-1 space-y-6">
            {NOTIFICATIONS.map((note) => (
              <div key={note.id} className="flex gap-4">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                  note.type === 'success' ? 'bg-emerald-500' :
                  note.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-slate-200">{note.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{note.message}</p>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-2 block">{note.date}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
            {t('dashboard.viewLogs')}
          </button>
        </div>
      </div>
    </div>
  );
};
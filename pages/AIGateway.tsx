import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AI_USAGE_DATA } from '../constants';
import { Zap, ShieldCheck } from 'lucide-react';
import { useI18n, useTheme } from '../contexts';

export const AIGateway: React.FC = () => {
  const { t } = useI18n();
  const { isDark } = useTheme();

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('ai.title')}</h2>
           <p className="text-slate-500 dark:text-slate-400 mt-1">{t('ai.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
                <ShieldCheck size={14} /> {t('ai.operational')}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Usage Chart */}
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('ai.consumption')}</h3>
            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={AI_USAGE_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b'}} />
                        <Tooltip 
                            cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}} 
                            contentStyle={{ 
                                backgroundColor: isDark ? '#1e293b' : '#fff',
                                borderRadius: '8px', 
                                border: isDark ? '1px solid #334155' : 'none', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                color: isDark ? '#fff' : '#000'
                            }} 
                        />
                        <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#64748b' }} />
                        <Bar dataKey="value" name="Completion Tokens" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} barSize={20} />
                        <Bar dataKey="value2" name="Prompt Tokens" stackId="a" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* Provider Status */}
         <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('ai.providers')}</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                <Zap size={16} className="text-amber-500 fill-amber-500"/>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Google Gemini</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('ai.primary')}</p>
                            </div>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 opacity-60">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                <div className="w-4 h-4 bg-slate-800 dark:bg-slate-200 rounded-full" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">OpenAI</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('ai.backup')}</p>
                            </div>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                    </div>
                </div>
                <button className="mt-4 w-full py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {t('ai.configure')}
                </button>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-xl shadow-lg text-white">
                 <h3 className="font-semibold text-lg mb-2">{t('ai.costOpt')}</h3>
                 <p className="text-indigo-100 text-sm mb-4" dangerouslySetInnerHTML={{ __html: `${t('ai.savedMsgPrefix')} <strong>$142.00</strong>.` }} />
                 <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '75%' }}></div>
                 </div>
                 <p className="text-xs text-indigo-200 text-right">{t('ai.budgetUsed')}</p>
            </div>
         </div>
      </div>
    </div>
  );
};
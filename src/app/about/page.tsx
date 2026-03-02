'use client';

import { useEffect } from 'react';
import { Rocket, CreditCard, ShieldCheck, Box, Activity, Layers, Database, Cpu, Palette } from 'lucide-react';
import { useI18n, usePageHeader } from '@/contexts';
import { SYSTEM_CONFIG } from '@/constants';

const TECH_STACK = [
  {
    category: 'Core Framework',
    icon: <Layers size={18} />,
    items: ['Next.js 16 (App Router)', 'React 19', 'TypeScript', 'Turbopack']
  },
  {
    category: 'UI & Experience',
    icon: <Palette size={18} />,
    items: ['Tailwind CSS 4', 'Radix UI', 'Framer Motion', 'Recharts & Mermaid']
  },
  {
    category: 'Backend & Data',
    icon: <Database size={18} />,
    items: ['Supabase (PostgreSQL)', 'Redis (ioredis)', 'RJSF Forms', 'Payment SDKs']
  },
  {
    category: 'AI & Intelligence',
    icon: <Cpu size={18} />,
    items: ['OpenAI SDK', 'Google Generative AI', 'AI Agents System']
  }
];

export default function Page() {
  const { setPageHeader } = usePageHeader();
  const { t } = useI18n();

  useEffect(() => {
    setPageHeader(t('about.title'), t('about.subtitle'));
  }, [setPageHeader, t]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          {t('about.heroTitle')}
        </h1>
        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto italic">
          {t('about.tagline')}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Rocket size={24} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('about.visionTitle')}</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-1 lg:col-span-3 bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-800 dark:to-zinc-900 p-6 rounded-lg border border-indigo-100 dark:border-zinc-700">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 font-bold text-lg">1</div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{t('about.priorities.automation.title')}</h3>
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {t('about.priorities.automation.quote')}
                  <br />
                  <strong>{t('about.improveLabel')}：</strong> {t('about.priorities.automation.desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="text-emerald-500" />
              <h3 className="font-bold text-zinc-900 dark:text-white">{t('about.priorities.commerce.title')}</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{t('about.priorities.commerce.quote')}</p>
            <div className="text-sm bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <strong>{t('about.actionLabel')}:</strong> {t('about.priorities.commerce.action')}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="text-blue-500" />
              <h3 className="font-bold text-zinc-900 dark:text-white">{t('about.priorities.isolation.title')}</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{t('about.priorities.isolation.quote')}</p>
            <div className="text-sm bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <strong>{t('about.actionLabel')}:</strong> {t('about.priorities.isolation.action')}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Box className="text-amber-500" />
              <h3 className="font-bold text-zinc-900 dark:text-white">{t('about.priorities.container.title')}</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{t('about.priorities.container.quote')}</p>
            <div className="text-sm bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <strong>{t('about.actionLabel')}:</strong> {t('about.priorities.container.action')}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-rose-500" />
              <h3 className="font-bold text-zinc-900 dark:text-white">{t('about.priorities.observability.title')}</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('about.priorities.observability.quote')}
              <br />
              <strong>{t('about.actionLabel')}:</strong> {t('about.priorities.observability.action')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Layers size={24} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('about.techStack')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TECH_STACK.map((tech) => (
            <div key={tech.category} className="p-5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400 font-medium">
                {tech.icon}
                <span>{tech.category}</span>
              </div>
              <ul className="space-y-2">
                {tech.items.map((item) => (
                  <li key={item} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center text-sm text-zinc-400 mt-12 pb-12 border-t border-zinc-100 dark:border-zinc-800 pt-8">
        <div>
          <div className="font-semibold text-zinc-600 dark:text-zinc-300 mb-1">{t('about.version')}</div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{SYSTEM_CONFIG.version}</span>
            <span className="text-[10px] font-mono opacity-60">{t('about.buildLabel', { build: SYSTEM_CONFIG.build })}</span>
          </div>
        </div>
        <div>
          <div className="font-semibold text-zinc-600 dark:text-zinc-300 mb-1">{t('about.environment')}</div>
          <div className="capitalize">{process.env.NODE_ENV}</div>
        </div>
      </div>
    </div>
  );
}

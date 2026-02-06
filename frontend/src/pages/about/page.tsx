import { useEffect } from 'react';
import { Rocket, CreditCard, ShieldCheck, Box, Activity } from 'lucide-react';
import { usePageHeader, useI18n } from '../../contexts';

const AboutPage = () => {
  const { setPageHeader } = usePageHeader();
  const { t } = useI18n();

  useEffect(() => {
    setPageHeader(t('about.title') || 'About System', t('about.subtitle') || 'Software Factory OS Architecture & Vision');
  }, [setPageHeader, t]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          Software Factory OS
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          "The factory is the product." — 构建下一代 AI 驱动的 SaaS 制造工厂。
        </p>
      </div>

      {/* Strategic Vision Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Rocket size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Architect's Vision (Top 5 Priorities)</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. AI Coder */}
            <div className="col-span-1 lg:col-span-3 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-xl border border-indigo-100 dark:border-slate-700">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 font-bold text-lg">1</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">极度自动化：AI Coder Agent</h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            "工厂应该制造机器，而不是手动拧螺丝。" <br/>
                            <strong>现状：</strong> 仅用于对话助理。<br/>
                            <strong>改进：</strong> 创建 <span className="text-indigo-600 dark:text-indigo-400 font-semibold">AI Coder Agent</span>，从“辅助开发”进化为“生成式开发”。输入需求直接生成 React 页面、API 接口和 SQL Schema。
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Billing */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="text-emerald-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">商业闭环</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    "没有支付能力的 SaaS 只是个玩具。"
                </p>
                <div className="text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <strong>Action:</strong> 集成 Stripe/Lemon Squeezy，构建统一计费网关。实现“出生即盈利”。
                </div>
            </div>

            {/* 3. Multi-tenancy */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="text-blue-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">极致隔离</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    "数据混在一起早晚出事。"
                </p>
                <div className="text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <strong>Action:</strong> 从逻辑隔离升级为 Schema 级物理隔离。支持高价值租户独享数据库实例。
                </div>
            </div>

            {/* 4. Dockerize */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                    <Box className="text-amber-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">容器化</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    "Delete the lock-in. 随时搬去火星。"
                </p>
                <div className="text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <strong>Action:</strong> 编写 Dockerfile。脱离对 Vercel 的强依赖，实现私有化与多云部署。
                </div>
            </div>

             {/* 5. Pulse Center */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow col-span-1 md:col-span-2 lg:col-span-3">
                <div className="flex items-center gap-3 mb-4">
                    <Activity className="text-rose-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">观测即真理 (Pulse Center)</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    "我需要一眼看到工厂的脉搏。哪里慢了？哪个 App 在爆发？" <br/>
                    <strong>Action:</strong> 建立统一的 SaaS 脉搏中心。聚合 QPS、Token 成本、API 错误率与用户增长热力图，实现数据驱动决策。
                </p>
            </div>
        </div>
      </div>

      {/* Footer / System Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-sm text-slate-400 mt-12">
        <div>
            <div className="font-semibold text-slate-600 dark:text-slate-300">Version</div>
            <div>0.5.0 (Alpha)</div>
        </div>
        <div>
            <div className="font-semibold text-slate-600 dark:text-slate-300">Tech Stack</div>
            <div>React • Node.js • Supabase • AI Agents</div>
        </div>
        <div>
            <div className="font-semibold text-slate-600 dark:text-slate-300">Environment</div>
            <div>{import.meta.env.MODE}</div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { authenticatedFetch } from '../../../../lib/http';

interface Policy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  resource: string;
  action: string;
  description: string;
}

export const PoliciesList = () => {
  const { t } = useI18n();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch('/api/admin/rbac/policies');
            if (res.ok) {
                const data = await res.json();
                setPolicies(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    fetchPolicies();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('identity.policies.title')}</h2>
      </div>

      <div className="grid gap-4">
        {loading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : policies.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No policies found</div>
        ) : policies.map(policy => (
            <div key={policy.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-lg ${policy.effect === 'allow' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                    <Shield size={20} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900 dark:text-white">{policy.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                            policy.effect === 'allow' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                            {policy.effect}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{policy.description}</p>
                    
                    <div className="mt-3 flex items-center gap-4 text-xs font-mono">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <span className="text-slate-400">Resource:</span>
                            <span>{policy.resource}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <span className="text-slate-400">Action:</span>
                            <span>{policy.action}</span>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

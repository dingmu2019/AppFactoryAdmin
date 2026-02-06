import { useState, useEffect } from 'react';
import { Plus, Key, Eye, EyeOff, Copy, ExternalLink, Inbox } from 'lucide-react';
import { useI18n, useToast } from '../../../../contexts';
import { authenticatedFetch } from '../../../../lib/http';

interface OAuthApp {
  id: string;
  name: string;
  description: string;
  api_key: string; // Acts as Client ID
  api_secret?: string; // Acts as Client Secret
  status: string;
}

export const OAuthAppsList = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Secret visibility map
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, string>>({});

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(data);
      } else {
        console.error('Failed to fetch apps:', res.status, res.statusText);
        showToast(`Failed to load apps: ${res.statusText}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while loading apps', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const revealSecret = async (id: string) => {
    if (visibleSecrets[id]) {
      const { [id]: _, ...rest } = visibleSecrets;
      setVisibleSecrets(rest);
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/admin/apps/${id}/credentials`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const apiSecret = data?.api_secret;
        if (!apiSecret) {
          showToast('当前应用未配置 Client Secret，可在“应用管理”中旋转凭据生成', 'error');
          return;
        }
        setVisibleSecrets(prev => ({ ...prev, [id]: apiSecret }));
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.error || 'Failed to fetch credentials', 'error');
      }
    } catch (err) {
      showToast('Failed to fetch credentials', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('identity.oauth.title')}</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={18} />
            {t('identity.oauth.create')}
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : apps.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Inbox size={48} className="text-slate-300 mb-4" />
                <p>No OAuth apps configured</p>
            </div>
        ) : apps.map(app => (
            <div key={app.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Key size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{app.name}</h3>
                            <p className="text-sm text-slate-500">{app.description || 'No description'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            app.status === 'Production' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                            {app.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t('identity.oauth.clientId')}</label>
                        <div className="flex items-center gap-2">
                            <code className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 font-mono text-sm flex-1 truncate">
                                {app.api_key}
                            </code>
                            <button onClick={() => copyToClipboard(app.api_key)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Client Secret</label>
                        <div className="flex items-center gap-2">
                            <code className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 font-mono text-sm flex-1 truncate text-slate-600 dark:text-slate-400">
                                {visibleSecrets[app.id] || '••••••••••••••••••••••••'}
                            </code>
                            <button onClick={() => revealSecret(app.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                                {visibleSecrets[app.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            {visibleSecrets[app.id] && (
                                <button onClick={() => copyToClipboard(visibleSecrets[app.id])} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                                    <Copy size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                        Redirect URIs: <span className="italic">Not configured</span>
                    </div>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        Configure <ExternalLink size={14} />
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

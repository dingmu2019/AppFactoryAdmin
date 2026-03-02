import { useState, useEffect } from 'react';
import { Plus, Key, Eye, EyeOff, Copy, ExternalLink, Inbox } from 'lucide-react';
import { useI18n, useToast } from '@/contexts';
import { authenticatedFetch } from '@/lib/http';
import { fetchApps as fetchSaaSApps } from '@/services/appService';

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
      const data = await fetchSaaSApps();
      setApps(data || []);
    } catch (err) {
      console.error(err);
      showToast(t('identity.oauth.toast.networkError'), 'error');
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
          showToast(t('identity.oauth.noSecret'), 'error');
          return;
        }
        setVisibleSecrets(prev => ({ ...prev, [id]: apiSecret }));
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.error || t('identity.oauth.fetchCredentialsFailed'), 'error');
      }
    } catch (err) {
      showToast(t('identity.oauth.fetchCredentialsFailed'), 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t('common.copySuccess'), 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{t('identity.oauth.title')}</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={18} />
            {t('identity.oauth.create')}
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
            <div className="py-12 text-center text-zinc-500">{t('common.loading')}</div>
        ) : apps.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                <Inbox size={48} className="text-zinc-300 mb-4" />
                <p>{t('identity.oauth.noApps')}</p>
            </div>
        ) : apps.map(app => (
            <div key={app.id} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Key size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{app.name}</h3>
                            <p className="text-sm text-zinc-500">{app.description || t('identity.roles.noDesc')}</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50 dark:bg-zinc-950 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">{t('identity.oauth.clientId')}</label>
                        <div className="flex items-center gap-2">
                            <code className="bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 font-mono text-sm flex-1 truncate">
                                {app.api_key}
                            </code>
                            <button onClick={() => copyToClipboard(app.api_key)} className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors">
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">{t('identity.oauth.clientSecret')}</label>
                        <div className="flex items-center gap-2">
                            <code className="bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 font-mono text-sm flex-1 truncate text-zinc-600 dark:text-zinc-400">
                                {visibleSecrets[app.id] || '••••••••••••••••••••••••'}
                            </code>
                            <button onClick={() => revealSecret(app.id)} className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors">
                                {visibleSecrets[app.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            {visibleSecrets[app.id] && (
                                <button onClick={() => copyToClipboard(visibleSecrets[app.id])} className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors">
                                    <Copy size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <div className="text-xs text-zinc-400">
                        {t('identity.oauth.redirectUris')}: <span className="italic">{t('identity.oauth.redirectNotConfigured')}</span>
                    </div>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        {t('identity.oauth.configure')} <ExternalLink size={14} />
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

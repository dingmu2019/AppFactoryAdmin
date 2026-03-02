import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { authenticatedFetch } from '../../../../lib/http';

interface Permission {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
}

export const PermissionsList = () => {
  const { t } = useI18n();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch('/api/admin/identity/permissions');
            if (res.ok) {
                const data = await res.json();
                setPermissions(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    fetchPermissions();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{t('identity.permissions.title')}</h2>
        <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
                placeholder={t('identity.permissions.searchPlaceholder')}
                className="pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm border-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                        <th className="px-6 py-4">{t('identity.permissions.code')}</th>
                        <th className="px-6 py-4">{t('identity.permissions.name')}</th>
                        <th className="px-6 py-4">{t('identity.permissions.category')}</th>
                        <th className="px-6 py-4">{t('identity.permissions.description')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {loading ? (
                         <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">{t('common.loading')}</td></tr>
                    ) : permissions.length === 0 ? (
                         <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">{t('identity.permissions.empty')}</td></tr>
                    ) : permissions.map(p => (
                        <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">{p.code}</td>
                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{p.name}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                    {p.category}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-zinc-500">{p.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Shield, Lock, Key, Users } from 'lucide-react';
import { useI18n, usePageHeader } from '../../../contexts';
import { RolesList } from './components/RolesList.tsx';
import { OAuthAppsList } from './components/OAuthAppsList.tsx';
import { PermissionsList } from './components/PermissionsList.tsx';
import { PoliciesList } from './components/PoliciesList.tsx';

export default function IdentityPage() {
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader(t('identity.title'), t('identity.subtitle'));
  }, [setPageHeader, t]);

  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'policies' | 'oauth'>('roles');

  const tabs = [
    { id: 'roles', label: t('identity.tabs.roles'), icon: Users },
    { id: 'permissions', label: t('identity.tabs.permissions'), icon: Lock },
    { id: 'policies', label: t('identity.tabs.policies'), icon: Shield },
    { id: 'oauth', label: t('identity.tabs.oauth'), icon: Key },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm gap-2
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'
                }
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'roles' && <RolesList />}
        {activeTab === 'permissions' && <PermissionsList />}
        {activeTab === 'policies' && <PoliciesList />}
        {activeTab === 'oauth' && <OAuthAppsList />}
      </div>
    </div>
  );
}


import React from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import type { SaaSAppLite } from "../types";

interface AppSidebarProps {
  apps: SaaSAppLite[];
  selectedAppId: string;
  setSelectedAppId: (id: string) => void;
  isLoadingApps: boolean;
  fetchApps: () => void;
  selectedApp: SaaSAppLite | null;
  t: any;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  apps,
  selectedAppId,
  setSelectedAppId,
  isLoadingApps,
  fetchApps,
  selectedApp,
  t,
}) => {
  return (
    <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
          <Bot size={18} />
          {t('aiGateway.appSelect')}
        </div>
        <button
          onClick={fetchApps}
          className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
          title={t('common.refresh')}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {isLoadingApps ? (
        <div className="text-sm text-zinc-500">{t('common.loading')}</div>
      ) : (
        <select
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {apps.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      {selectedApp && (
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">{t('aiGateway.appId')}</div>
          <div className="text-sm font-mono text-zinc-800 dark:text-zinc-100 break-all mt-1">{selectedApp.id}</div>
          {selectedApp.status && (
            <div className="text-xs text-zinc-500 mt-2">{t('aiGateway.appStatus')}: {selectedApp.status}</div>
          )}
        </div>
      )}
    </div>
  );
};

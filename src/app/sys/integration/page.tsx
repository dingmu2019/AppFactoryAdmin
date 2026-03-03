
'use client';

import React, { useState, useEffect } from 'react';
import { useI18n, useToast } from '@/contexts';
import { authenticatedFetch } from '@/lib/http';
import { DatabaseConfigForm as DatabaseConfig } from './components/DatabaseConfig';
import { EmailConfigForm as EmailConfig } from './components/EmailConfig';
import { LLMConfigForm as LLMConfig } from './components/LLMConfig';
import { PaymentConfigForm as PaymentConfig } from './components/PaymentConfig';
import { EnterpriseConfigForm } from './components/EnterpriseConfig';
import { FeishuConfigForm } from './components/FeishuConfig';
import { LarkConfigForm } from './components/LarkConfig';
import { WeChatConfigForm } from './components/WeChatConfig';
import { WhatsAppConfigForm } from './components/WhatsAppConfig';
import { NotificationConfigForm } from './components/NotificationConfig';
import { ConfirmModal } from '@/components/ConfirmModal';

import { 
  Bot, 
  Mail, 
  Database, 
  CreditCard, 
  Bell, 
  Building2, 
  MessageSquare, 
  Globe, 
  Smartphone 
} from 'lucide-react';
import type { IntegrationConfig } from '../../../../types/integration';

export default function IntegrationPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('llm');
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const tabs = [
    { id: 'llm', label: t('common.integration.tabs.llm'), icon: Bot, component: LLMConfig },
    { id: 'email', label: t('common.integration.tabs.email'), icon: Mail, component: EmailConfig },
    { id: 'database', label: t('common.integration.tabs.database'), icon: Database, component: DatabaseConfig },
    { id: 'payment', label: t('common.integration.tabs.payment'), icon: CreditCard, component: PaymentConfig },
    { id: 'notification', label: t('common.integration.tabs.notification'), icon: Bell, component: NotificationConfigForm },
    { id: 'wechat', label: t('common.integration.tabs.wechat'), icon: MessageSquare, component: WeChatConfigForm },
    { id: 'feishu', label: t('common.integration.tabs.feishu'), icon: Building2, component: FeishuConfigForm },
    { id: 'lark', label: t('common.integration.tabs.lark'), icon: Globe, component: LarkConfigForm },
    { id: 'whatsapp', label: t('common.integration.tabs.whatsapp'), icon: Smartphone, component: WhatsAppConfigForm },
    { id: 'enterprise', label: t('common.integration.tabs.enterprise'), icon: Building2, component: EnterpriseConfigForm },
  ];

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/admin/integrations');
      if (!res.ok) throw new Error('Failed to fetch configs');
      const data = await res.json();
      setConfigs(data || []);
    } catch (error: any) {
      showToast(error.message || t('common.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (data: any, enabled: boolean, id?: string, isSorting?: boolean) => {
    if (!isSorting) setSaving(true);
    try {
      // If it's a legacy ID (not a UUID), treat as a new insert for LLM to migrate it to its own row
      const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const actualId = isUuid ? id : undefined;

      const payload = {
        id: actualId,
        category: activeTab,
        config: data,
        is_enabled: enabled
      };

      const res = await authenticatedFetch('/api/admin/integrations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('common.saveFailed'));
      }

      if (!isSorting) showToast(t('common.saveSuccess'), 'success');
      await fetchConfigs();
    } catch (error: any) {
      showToast(error.message || t('common.saveFailed'), 'error');
    } finally {
      if (!isSorting) setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await authenticatedFetch(`/api/admin/integrations?id=${pendingDeleteId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('common.deleteFailed'));
      }

      showToast(t('common.deleteSuccess'), 'success');
      await fetchConfigs();
    } catch (error: any) {
      showToast(error.message || t('common.deleteFailed'), 'error');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleTest = async (config: any, testOptions?: any) => {
    try {
      let endpoint = '';
      let payload: any = config;

      if (activeTab === 'llm') {
          endpoint = '/api/admin/integrations/llm/test';
      } else if (activeTab === 'email') {
          endpoint = '/api/admin/integrations/email/test';
          // Email test API expects { to, ...config }
          if (testOptions) payload = { to: testOptions.to, ...config };
      } else if (['wechat', 'feishu', 'lark'].includes(activeTab)) {
          endpoint = '/api/admin/integrations/message/test';
          // Message test API expects { channel, recipient, content, config }
          if (testOptions) {
              payload = {
                  channel: activeTab,
                  recipient: testOptions.recipient,
                  content: testOptions.content,
                  config: config
              };
          } else {
              // Default if no options provided by component
              payload = {
                  channel: activeTab,
                  recipient: 'test_recipient',
                  content: 'Test message',
                  config: config
              };
          }
      }
      
      if (!endpoint) return;

      showToast(t('common.testing'), 'info');

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || result.error || t('common.testFailed'));
      }

      showToast(t('common.testSuccess') + (result.message ? `: ${result.message}` : ''), 'success');
    } catch (error: any) {
      showToast(error.message || t('common.testFailed'), 'error');
    }
  };

  const handleSort = async (newOrder: IntegrationConfig[]) => {
     // Optimistic update
     setConfigs(prev => {
         const other = prev.filter(p => p.category !== activeTab);
         return [...other, ...newOrder];
     });
     
     // TODO: Implement backend sort order saving if needed. 
     // Currently the API doesn't support explicit sort order field update in batch.
     // Assuming the UI sorting is enough for now or we save order index in config.
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || (() => <div>Not Found</div>);
  
  // Filter configs for current tab
  let currentConfigs = configs.filter(c => c.category === activeTab);
  
  // Special handling for LLM: flatten legacy models array if exists
  if (activeTab === 'llm') {
    const flattened: IntegrationConfig[] = [];
    const standaloneModels = new Set(
        currentConfigs
            .filter(cfg => !(cfg.config?.models && Array.isArray(cfg.config.models)))
            .map(cfg => `${cfg.config?.provider}:${cfg.config?.model}`)
    );

    currentConfigs.forEach(cfg => {
      if (cfg.config?.models && Array.isArray(cfg.config.models)) {
        cfg.config.models.forEach((m: any, idx: number) => {
          // If this model has already been migrated to a standalone row, skip the legacy one
          const modelKey = `${m.provider || 'openai'}:${m.model}`;
          if (standaloneModels.has(modelKey)) return;

          flattened.push({
            ...cfg,
            id: m._id || `${cfg.id}-${idx}`,
            config: m,
            is_enabled: m.enabled !== false && cfg.is_enabled,
            is_legacy: true, // Mark as legacy for UI/save handling
            legacy_parent_id: cfg.id
          } as any);
        });
      } else {
        flattened.push(cfg);
      }
    });
    currentConfigs = flattened;
  }
  
  // For singleton components (email, payment, etc.), we might pass the first config or empty
  const singletonConfig = currentConfigs[0] || {};

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-100px)]">
      {/* Sidebar Tabs */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden sticky top-6">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-white">{t('common.integration.title')}</h2>
            </div>
            <nav className="p-2 space-y-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                            ${activeTab === tab.id 
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' 
                                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }
                        `}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
         <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            {loading && configs.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-zinc-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('common.loading')}
                </div>
            ) : (
                <ActiveComponent 
                    // Props for singleton components
                    initialData={singletonConfig.config || {}}
                    initialEnabled={singletonConfig.is_enabled || false}
                    
                    // Props for list components (LLM)
                    configs={currentConfigs}
                    
                    // Handlers
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onTest={handleTest}
                    onSort={handleSort}
                    isSaving={saving}
                />
            )}
         </div>
      </div>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete')}
        message={t('common.confirmDeleteMsg')}
        cancelText={t('common.cancel')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}

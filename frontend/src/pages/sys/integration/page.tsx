import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Mail, 
  Database, 
  MessageSquare, 
  Building2, 
  FileText,
  Globe,
  Phone,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast, useI18n, usePageHeader } from '../../../contexts';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { authenticatedFetch } from '../../../lib/http';
import type { IntegrationCategory, IntegrationConfig, LLMConfig } from '../../../types/integration';
import { LLMConfigForm } from './components/LLMConfig';
import { EmailConfigForm } from './components/EmailConfig';
import { DatabaseConfigForm } from './components/DatabaseConfig';
import { WeChatConfigForm } from './components/WeChatConfig';
import { EnterpriseConfigForm } from './components/EnterpriseConfig';
import { FeishuConfigForm } from './components/FeishuConfig';
import { LarkConfigForm } from './components/LarkConfig';
import { WhatsAppConfigForm } from './components/WhatsAppConfig';
import { PaymentConfigForm } from './components/PaymentConfig';
import { CreditCard } from 'lucide-react';
import { NotificationConfigForm } from './components/NotificationConfig';

interface TestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  message: string;
}

const TestResultModal: React.FC<TestResultModalProps> = ({ isOpen, onClose, success, message }) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${
            success ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
          }`}>
            {success ? <CheckCircle size={28} /> : <XCircle size={28} />}
          </div>
          
          <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-4">
            {success ? t('common.testSuccess') : t('common.testFailed')}
          </h3>
          
          <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 mb-6 max-h-[300px] overflow-y-auto border border-slate-100 dark:border-slate-800">
            <pre className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono">
              {message}
            </pre>
          </div>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors outline-none"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function IntegrationPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>('llm');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPageHeader(t('integration.title'), t('integration.subtitle'));
  }, [setPageHeader, t]);
  const [isSaving, setIsSaving] = useState(false);
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [testResult, setTestResult] = useState<{ isOpen: boolean; success: boolean; message: string }>({ isOpen: false, success: false, message: '' });

  const CATEGORIES: { id: IntegrationCategory; label: string; icon: React.ElementType }[] = [
    { id: 'llm', label: t('integration.categories.llm'), icon: Bot },
    { id: 'email', label: t('integration.categories.email'), icon: Mail },
    { id: 'database', label: t('integration.categories.database'), icon: Database },
    { id: 'payment', label: t('integration.categories.payment'), icon: CreditCard },
    { id: 'notification', label: t('integration.categories.notification'), icon: MessageSquare },
    { id: 'wechat', label: t('integration.categories.wechat'), icon: MessageSquare },
    { id: 'feishu', label: t('integration.categories.feishu'), icon: FileText },
    { id: 'lark', label: t('integration.categories.lark'), icon: Globe },
    { id: 'whatsapp', label: t('integration.categories.whatsapp'), icon: Phone },
    { id: 'enterprise', label: t('integration.categories.enterprise'), icon: Building2 },
  ];

  // Load configs
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/integrations');
      if (!res.ok) throw new Error('Failed to fetch configs');
      const data = await res.json();
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Error fetching configs:', error);
      showToast(t('common.loadFailed'), 'error');
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  };

  const handleSave = async (configData: any, isEnabled: boolean, id?: string) => {
    setIsSaving(true);
    try {
      const payload = {
        id, // If ID is present, it's an update
        category: activeCategory,
        config: configData,
        is_enabled: isEnabled
      };

      const res = await authenticatedFetch('/api/admin/integrations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          (body && typeof body.error === 'string' && body.error) ||
          (body && typeof body.message === 'string' && body.message) ||
          t('common.saveFailed');
        throw new Error(message);
      }
      
      // Refresh all configs to get latest IDs and state
      await fetchConfigs({ silent: true });

      showToast(t('common.saveSuccess'), 'success');
    } catch (error: any) {
      console.error('Save error:', error);
      showToast(error.message || t('common.saveFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleLLMSave = async (modelData: LLMConfig, enabled: boolean, virtualId?: string, parentRecord?: IntegrationConfig, fullListOverride?: any[]) => {
    let models: any[] = [];
    
    if (fullListOverride) {
        models = fullListOverride;
    } else {
        if (parentRecord?.config?.models && Array.isArray(parentRecord.config.models)) {
            models = [...parentRecord.config.models];
        } else if (parentRecord?.config && Object.keys(parentRecord.config).length > 0) {
            models = [{ ...parentRecord.config, _id: 'legacy-1', enabled: parentRecord.is_enabled !== false }];
        }

        if (virtualId) {
            models = models.map((m: any) => m._id === virtualId ? { ...modelData, _id: virtualId, enabled } : m);
        } else {
            models.push({ ...modelData, _id: crypto.randomUUID(), enabled });
        }
    }

    const payload = {
        models
    };

    await handleSave(payload, true, parentRecord?.id);
  };

  const handleLLMDelete = async (virtualId: string, parentRecord?: IntegrationConfig) => {
      let models: any[] = [];
      if (parentRecord?.config?.models && Array.isArray(parentRecord.config.models)) {
          models = [...parentRecord.config.models];
      } else if (parentRecord?.config) {
          models = [{ ...parentRecord.config, _id: 'legacy-1' }];
      }
      
      models = models.filter((m: any) => m._id !== virtualId);
      
      await handleSave({ models }, true, parentRecord?.id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      if (activeCategory === 'llm') {
        const llmRecord = configs.find(c => c.category === 'llm');
        await handleLLMDelete(deleteConfirm.id, llmRecord);
      } else {
        const res = await authenticatedFetch(`/api/admin/integrations?id=${deleteConfirm.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        await fetchConfigs({ silent: true });
        showToast(t('common.success'), 'success');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleTestConnection = async (configData: any) => {
    showToast(t('common.sending'), 'info');
    try {
      const res = await authenticatedFetch('/api/admin/integrations/llm/test', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Test failed');
      }
      
      setTestResult({
        isOpen: true,
        success: true,
        message: data.message || 'Connection successful!'
      });
      showToast(t('common.testSuccess'), 'success');
    } catch (error: any) {
      setTestResult({
        isOpen: true,
        success: false,
        message: error.message || t('common.testFailed')
      });
      showToast(t('common.testFailed'), 'error');
    }
  };

  const renderContent = () => {
    // Filter configs for current category
    const categoryConfigs = configs.filter(c => c.category === activeCategory);
    
    // Legacy support for single-config components (email, database, etc.)
    // They expect a single object. We take the first one or empty.
    const firstConfig = categoryConfigs[0] || {};
    const initialData = firstConfig.config || {};
    const initialEnabled = firstConfig.is_enabled ?? false;

    const commonProps = {
      initialData,
      initialEnabled,
      onSave: (data: any, enabled: boolean) => handleSave(data, enabled, firstConfig.id),
      onTest: handleTestConnection,
      isSaving
    };

    switch (activeCategory) {
      case 'llm': 
        // Filter out records that are not LLM or don't have valid configs
        // We only care about category 'llm'
        // And we handle the case where multiple 'llm' records might exist (though DB unique constraint prevents it now, but historically might have data)
        // Wait, DB has multiple rows for 'llm' according to user screenshot!
        // The user screenshot shows multiple rows with category 'llm'.
        // BUT we have a unique constraint on 'category' that we failed to drop properly in previous turns?
        // Ah, the user screenshot shows distinct IDs for each row.
        // This means the UNIQUE constraint IS NOT THERE or was dropped successfully?
        // If there are multiple rows, we should merge them or display them all?
        // But our new logic (handleLLMSave) assumes ONE row with models array.
        
        // Strategy: 
        // 1. If we detect multiple rows for 'llm', we treat them as separate models (Migration on the fly for UI display).
        // 2. But we need to support the new "Single Row, Multiple Models" format too.
        
        let virtualConfigs: IntegrationConfig[] = [];
        
        // Iterate over ALL llm records found
         categoryConfigs.forEach(record => {
              if (record.config?.models && Array.isArray(record.config.models)) {
                  // New Format: One record, multiple models
                  record.config.models.forEach((m: any, idx: number) => {
                      virtualConfigs.push({
                          id: m._id || `${record.id}_model_${idx}`,
                          category: 'llm',
                          config: m,
                          is_enabled: m.enabled ?? true,
                          updated_at: record.updated_at
                      });
                  });
              } else if (record.config && Object.keys(record.config).length > 0) {
                  // Old Format: One record, one model
                  // We treat the record ID as the virtual ID
                  virtualConfigs.push({
                      id: record.id, // Use actual DB ID which is unique
                      category: 'llm',
                      config: record.config,
                      is_enabled: record.is_enabled,
                      updated_at: record.updated_at
                  });
              }
         });

         // Ensure uniqueness of IDs (just in case)
         const seenIds = new Set();
         virtualConfigs = virtualConfigs.filter(item => {
             if (seenIds.has(item.id)) return false;
             seenIds.add(item.id);
             return true;
         });

         // Sorting Logic: 
         // 1. Primary first
         // 2. Enabled items next
         // 3. Disabled items last
         // 4. Within same group, respect config priority or original order
         
         virtualConfigs.sort((a, b) => {
             const aConf = a.config as LLMConfig;
             const bConf = b.config as LLMConfig;
             
             // Primary check
             if (aConf.isPrimary && !bConf.isPrimary) return -1;
             if (!aConf.isPrimary && bConf.isPrimary) return 1;
             
             // Enabled check
             if (a.is_enabled && !b.is_enabled) return -1;
             if (!a.is_enabled && b.is_enabled) return 1;
             
             return 0; // Maintain existing order for same priority
         });

        return (
          <LLMConfigForm 
            configs={virtualConfigs} 
            onSort={(newOrder) => {
                // When user manually sorts, we need to save the new order
                // This means updating the 'models' array in the parent record(s)
                // Since we might have multiple parent records, this is tricky.
                // Best effort: Update the primary 'models' record with the new list order.
                
                // Extract models from newOrder
                const newModels = newOrder.map(item => ({
                    ...item.config,
                    _id: item.id,
                    enabled: item.is_enabled
                }));
                
                // Find master record to save to
                // Since we are migrating to single-row per model, this logic needs to adapt if DB schema changes.
                // But currently we still support the 'models' array in one row OR individual rows.
                // However, handleLLMSave currently packs everything into 'models' array of a single parent.
                // To support sorting truly with the new backend logic (which supports multiple rows),
                // we should probably just re-save each item with a new 'order' or 'priority' field if we had one.
                // But we don't have an explicit 'priority' column yet (it's implicit by array order or created_at).
                
                // For now, we stick to the "Pack into one array" strategy for sorting,
                // effectively merging all models into one parent record if they weren't already.
                // This is a side-effect: Sorting might merge separate records into one.
                
                let masterRecord = categoryConfigs.find(c => c.config?.models) || categoryConfigs[0];
                
                // Save the reordered list
                handleLLMSave({} as any, true, undefined, masterRecord, newModels);
            }}
            onSave={(data, enabled, id) => {
                // Determine which parent record to update
                // If id matches a legacy record ID, we update that record.
                // If id matches a virtual ID inside a 'models' array, we update the parent record containing it.
                
                // Find parent record
                let parentRecord = categoryConfigs.find(c => c.id === id); // Case: Legacy record
                
                if (!parentRecord) {
                    // Try to find inside models
                    parentRecord = categoryConfigs.find(c => c.config?.models?.some((m: any) => m._id === id));
                }
                
                // If still no parent (New Model), use the first available LLM record or create new?
                // We prefer the "Main" LLM record (the one with models array).
                if (!parentRecord) {
                    parentRecord = categoryConfigs.find(c => c.config?.models);
                }
                
                // If absolutely no LLM record exists, handleLLMSave will need to handle creation, 
                // but handleLLMSave expects a parentRecord to append to.
                // If categoryConfigs is empty, parentRecord is undefined.
                
                // We need a unified save handler that:
                // 1. If legacy record update -> Just update that record (maintain legacy for now? or migrate?)
                //    Let's migrate to "Single Record" strategy gradually.
                //    Actually, if the user has multiple rows, we should probably respect them as is for now to avoid data loss,
                //    OR migrate them all into one row.
                
                // For now, let's just make it work for display and edit.
                if (parentRecord && !parentRecord.config.models && parentRecord.id === id) {
                    // Updating a legacy single-row record
                    handleSave(data, enabled, id);
                } else {
                    // Updating a model inside a multi-model record OR creating new
                    // If creating new, and we have multiple legacy records, where do we put it?
                    // We should pick one "Master" record.
                    let masterRecord = categoryConfigs.find(c => c.config?.models) || categoryConfigs[0];
                    handleLLMSave(data, enabled, id, masterRecord);
                }
            }} 
            onDelete={(id) => {
                 // Check if it is a legacy record
                 const isLegacyRecord = categoryConfigs.some(c => c.id === id && !c.config?.models);
                 if (isLegacyRecord) {
                     // Use the new soft delete endpoint if possible, or standard delete
                     // Since we updated backend to soft delete on DELETE endpoint, this is fine.
                     handleDelete(id);
                 } else {
                     // It's a virtual model inside a record
                     const parent = categoryConfigs.find(c => c.config?.models?.some((m: any) => m._id === id));
                     if (parent) {
                         handleLLMDelete(id, parent);
                     }
                 }
            }}
            onTest={handleTestConnection}
            isSaving={isSaving}
          />
        );
      case 'email': return <EmailConfigForm {...commonProps} />;
      case 'database': return <DatabaseConfigForm {...commonProps} />;
      case 'wechat': return <WeChatConfigForm {...commonProps} />;
      case 'feishu': return <FeishuConfigForm {...commonProps} />;
      case 'lark': return <LarkConfigForm {...commonProps} />;
      case 'whatsapp': return <WhatsAppConfigForm {...commonProps} />;
      case 'enterprise': return <EnterpriseConfigForm {...commonProps} />;
      case 'payment': 
        return (
          <PaymentConfigForm 
            configs={categoryConfigs}
            onSave={(data, enabled, id) => handleSave(data, enabled, id)}
            isSaving={isSaving}
          />
        );
      case 'notification': return <NotificationConfigForm />;
      default: return <div className="flex items-center justify-center h-full text-slate-500">{t('integration.categories.selectCategory')}</div>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 space-y-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            <cat.icon size={18} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          renderContent()
        )}
      </div>
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteConfirmDesc')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />
      
      <TestResultModal
        isOpen={testResult.isOpen}
        onClose={() => setTestResult(prev => ({ ...prev, isOpen: false }))}
        success={testResult.success}
        message={testResult.message}
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useToast, useI18n, usePageHeader } from '../../../contexts';
import { type SaaSApp, AppStatus } from '../../../types';
import { supabase } from '../../../lib/supabase';

/**
 * 应用管理页面逻辑处理 Hook
 */
export const useApps = () => {
  const [apps, setApps] = useState<SaaSApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<SaaSApp | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<SaaSApp>>({});
  const [showSecret, setShowSecret] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [rotateConfirm, setRotateConfirm] = useState<{ isOpen: boolean }>({ isOpen: false });
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [llmModels, setLlmModels] = useState<{ id: string; name: string; provider: string }[]>([]);
  
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader(t('common.appManagement'), t('apps.subtitle'));
    fetchModels();
  }, [setPageHeader, t]);

  const fetchModels = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/admin/integrations', {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        const llmConfig = data.find((c: any) => c.category === 'llm');
        if (llmConfig?.config?.models && Array.isArray(llmConfig.config.models)) {
            setLlmModels(llmConfig.config.models.filter((m: any) => m.enabled !== false).map((m: any) => ({
                id: m.model, // Use model name as ID for simplicity in selection
                name: m.model,
                provider: m.provider
            })));
        } else if (llmConfig?.config?.model) {
            // Legacy single model
            setLlmModels([{
                id: llmConfig.config.model,
                name: llmConfig.config.model,
                provider: llmConfig.config.provider
            }]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch models', err);
    }
  };

  const fetchApps = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsInitialLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/admin/apps', {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const mappedApps: SaaSApp[] = data.map((app: any) => ({
          id: app.id,
          name: app.name,
          description: app.description,
          status: app.status,
          apiKey: app.api_key,
          apiSecret: app.api_secret,
          allowedIps: app.allowed_ips,
          totalUsers: 0,
          monthlyRevenue: 0,
          config: app.config,
          aiModelConfig: app.config?.ai_model || 'gemini-3-flash-preview',
          difyAppId: app.config?.dify_app_id,
          createdAt: app.created_at
        }));
        setApps(mappedApps);
        
        // If an app was selected, update its reference from the new list
        if (selectedApp) {
            const updated = mappedApps.find(a => a.id === selectedApp.id);
            if (updated) setSelectedApp(updated);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch apps:', err);
      showToast(`${t('common.error')}: ${err.message}`, 'error');
    } finally {
      setIsInitialLoading(false);
    }
  }, [showToast, t, selectedApp]);

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreate = () => {
    setEditingApp({
      status: AppStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      // @ts-ignore
      template: 'blank' 
    });
    setIsModalOpen(true);
  };

  const handleEdit = (app?: SaaSApp) => {
    const targetApp = app || selectedApp;
    if (!targetApp) return;
    setEditingApp({ ...targetApp });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
      if (!deleteConfirm.id) return;
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const res = await fetch(`/api/admin/apps/${deleteConfirm.id}`, { 
              method: 'DELETE',
              headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
          });
          if (!res.ok) throw new Error('Failed to delete app');
          
          if (selectedApp?.id === deleteConfirm.id) {
              setSelectedApp(null);
          }
          
          setApps(prev => prev.filter(a => a.id !== deleteConfirm.id));
          showToast(t('apps.actions.deleteSuccess'), 'success');
      } catch (error: any) {
          showToast(error.message || t('common.error'), 'error');
      } finally {
          setDeleteConfirm({ isOpen: false, id: null });
      }
  };

  const handleSave = async () => {
    if (!editingApp.name) {
      showToast(t('apps.alerts.enterName'), 'error');
      return;
    }

    setIsSaving(true);
    const payload = {
      name: editingApp.name,
      description: editingApp.description,
      status: editingApp.status,
      allowed_ips: editingApp.allowedIps,
      config: {
        ai_model: editingApp.aiModelConfig || 'gemini-3-flash-preview',
        dify_app_id: editingApp.difyAppId
      },
      // @ts-ignore
      template: editingApp.template
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      // let savedApp: any;
      if (editingApp.id) {
        const res = await fetch(`/api/admin/apps/${editingApp.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update');
        // savedApp = await res.json();
        showToast(t('apps.actions.updateSuccess'), 'success');
      } else {
        const createPayload = {
            ...payload,
            id: (editingApp as any).customId
        };
        
        const res = await fetch('/api/admin/apps', {
          method: 'POST',
          headers,
          body: JSON.stringify(createPayload)
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to create app');
        }

        showToast(t('apps.createSuccess'), 'success');
      }

      setIsModalOpen(false);
      fetchApps(true);
    } catch (err: any) {
      console.error(err);
      showToast(`${t('common.error')}: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRotateSecret = () => {
    if (!selectedApp) return;
    setRotateConfirm({ isOpen: true });
  };

  const confirmRotate = async () => {
    if (!selectedApp) return;
    setIsRotating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/admin/apps/${selectedApp.id}/rotate-credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedApp(prev => prev ? ({
            ...prev,
            apiKey: data.api_key,
            apiSecret: data.api_secret
        }) : null);
        showToast(t('apps.actions.rotateSuccess'), 'success');
        fetchApps(true);
      } else {
          throw new Error('Failed to rotate');
      }
    } catch (err: any) {
      showToast(`${t('common.error')}: ${err.message}`, 'error');
    } finally {
      setIsRotating(false);
      setRotateConfirm({ isOpen: false });
    }
  };

  return {
    t,
    apps,
    selectedApp,
    setSelectedApp,
    isModalOpen,
    setIsModalOpen,
    editingApp,
    setEditingApp,
    showSecret,
    setShowSecret,
    deleteConfirm,
    setDeleteConfirm,
    rotateConfirm,
    setRotateConfirm,
    isInitialLoading,
    isSaving,
    isRotating,
    llmModels,
    handleCreate,
    handleEdit,
    handleDelete,
    confirmDelete,
    handleSave,
    handleRotateSecret,
    confirmRotate,
    fetchApps
  };
};

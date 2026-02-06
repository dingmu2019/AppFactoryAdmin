import React, { useState, useEffect } from 'react';
import { 
  Plus, MoreVertical, 
  Key,
  Globe, Database, Cpu, Check, AppWindow, X, Eye, EyeOff, Edit2, Trash2, RefreshCw, Copy,
  ShoppingCart, Bot, Wrench, Layout, Settings
} from 'lucide-react';
import { useToast, useI18n, usePageHeader } from '../../contexts';
import { ConfirmModal } from '../../components/ConfirmModal';
import { type SaaSApp, AppStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';

const AppsPage: React.FC = () => {
  const [apps, setApps] = useState<SaaSApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<SaaSApp | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<SaaSApp>>({});
  const [showSecret, setShowSecret] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  
  // JSON Schema
  const [configSchema, setConfigSchema] = useState<any>(null);
  const [configFormData, setConfigFormData] = useState<any>({});

  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader(t('common.appManagement'), t('apps.subtitle') || 'Manage your SaaS applications and configurations');
    
    const fetchSchema = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        try {
            const res = await fetch('/api/admin/apps/config-schema', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setConfigSchema(data);
            } else {
                console.error("Failed to load schema:", res.status);
            }
        } catch (err) {
            console.error("Failed to load schema", err);
        }
    };

    fetchSchema();
  }, [setPageHeader, t]);

  const fetchApps = async () => {
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
          allowedIps: app.allowed_ips, // New field
          totalUsers: 0, // Mock for now
          monthlyRevenue: 0, // Mock for now
          // Flatten config for UI if needed, but now we keep it raw for Form
          config: app.config,
          aiModelConfig: app.config?.ai_model || 'gemini-3-flash-preview',
          difyAppId: app.config?.dify_app_id,
          createdAt: app.created_at
        }));
        setApps(mappedApps);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
      showToast('Failed to load apps', 'error');
    }
  };

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
    setConfigFormData({});
    setIsModalOpen(true);
  };

  const handleEdit = () => {
    if (!selectedApp) return;
    setEditingApp({ ...selectedApp });
    // @ts-ignore
    setConfigFormData(selectedApp.config || {});
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
          setApps(prev => prev.filter(a => a.id !== deleteConfirm.id));
          showToast(t('apps.actions.deleteSuccess'), 'success');
      } catch (error: any) {
          showToast(error.message, 'error');
      } finally {
          setDeleteConfirm({ isOpen: false, id: null });
      }
  };

  const handleSave = async () => {
    if (!editingApp.name) {
      alert(t('apps.alerts.enterName'));
      return;
    }

    const payload = {
      name: editingApp.name,
      description: editingApp.description,
      status: editingApp.status,
      allowed_ips: editingApp.allowedIps, // New field
      config: {
        ...configFormData,
        ai_model: editingApp.aiModelConfig || configFormData.ai_model,
        dify_app_id: editingApp.difyAppId || configFormData.dify_app_id
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

      let savedApp: any;
      if (editingApp.id) {
        // Update
        const res = await fetch(`/api/admin/apps/${editingApp.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update');
        savedApp = await res.json();
      } else {
        // Create
        // If customId is provided, include it in payload
        const createPayload = {
            ...payload,
            id: (editingApp as any).customId
        };
        
        const res = await fetch(`/api/admin/apps`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createPayload)
        });
        if (!res.ok) throw new Error('Failed to create');
        savedApp = await res.json();
      }

      // Refresh list
      fetchApps();
      setIsModalOpen(false);
      showToast(editingApp.id ? 'App updated' : 'App created', 'success');
      
      // If editing currently selected, update it
      if (selectedApp && selectedApp.id === editingApp.id) {
        // Optimistic update or refetch needed. We refetch all above, but selectedApp needs update.
        // We'll rely on user re-selecting or just update selectedApp state manually with mapped data.
        const mappedSaved: SaaSApp = {
            id: savedApp.id,
            name: savedApp.name,
            description: savedApp.description,
            status: savedApp.status,
            apiKey: savedApp.api_key,
            apiSecret: savedApp.api_secret,
            allowedIps: savedApp.allowed_ips,
            totalUsers: 0,
            monthlyRevenue: 0,
            aiModelConfig: savedApp.config?.ai_model,
            difyAppId: savedApp.config?.dify_app_id,
            createdAt: savedApp.created_at
        };
        setSelectedApp(mappedSaved);
      }
    } catch (err) {
      console.error(err);
      showToast('Operation failed', 'error');
    }
  };

  const handleRotateSecret = async () => {
    if (!selectedApp || !confirm('Are you sure? Old keys will stop working immediately.')) return;
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
        // Update selected app with new credentials
        setSelectedApp(prev => prev ? ({
            ...prev,
            apiKey: data.api_key,
            apiSecret: data.api_secret
        }) : null);
        showToast('Credentials rotated', 'success');
        // Refresh list to update key in list view too
        fetchApps();
      }
    } catch (err) {
      showToast('Failed to rotate credentials', 'error');
    }
  };

  const StatusBadge = ({ status }: { status: AppStatus }) => {
    const styles = {
      [AppStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      [AppStatus.DEVELOPMENT]:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
      [AppStatus.SUSPENDED]: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    };
    const localeKey = `apps.status.${status.toLowerCase()}`;

    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>{t(localeKey)}</span>;
  };

  const CopyField = ({ label, value }: { label: string; value: string }) => (
    <div className="group relative">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <code className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md text-slate-700 dark:text-slate-300 font-mono text-sm flex-1 truncate border border-slate-200 dark:border-slate-700">
          {value}
        </code>
        <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" onClick={() => navigator.clipboard.writeText(value)}>
          <Copy size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="w-full lg:w-1/4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('apps.yourApps')}</h3>
          <button onClick={handleCreate} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> {t('common.newApp')}
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
          {apps.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${
                selectedApp?.id === app.id
                  ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold ${selectedApp?.id === app.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-200'}`}>{app.name}</h4>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{app.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Globe size={12} /> {app.totalUsers} {t('apps.users')}
                </span>
                <span className="flex items-center gap-1">
                  <Database size={12} /> {app.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-200">
        {selectedApp ? (
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedApp.name}</h2>
                    <StatusBadge status={selectedApp.status} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{selectedApp.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleEdit} className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors" title={t('common.edit')}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(selectedApp.id)} className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors" title={t('common.delete')}>
                    <Trash2 size={18} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Key className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('apps.credentials')}</h3>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 space-y-6">
                  <CopyField label={t('apps.appId')} value={selectedApp.id} />
                  <CopyField label={t('apps.pubKey')} value={selectedApp.apiKey} />
                  
                  <div className="group relative">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">IP Whitelist</label>
                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md text-slate-700 dark:text-slate-300 font-mono text-sm border border-slate-200 dark:border-slate-700">
                      {selectedApp.allowedIps || 'All (*)'}
                    </div>
                  </div>

                  {/* Secret Key with Rotate & Visibility */}
                  <div className="group relative">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('apps.secretKey')}</label>
                        <button 
                            onClick={handleRotateSecret}
                            className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                            <RefreshCw size={12} /> Rotate
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <code className="block w-full bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md text-slate-700 dark:text-slate-300 font-mono text-sm border border-slate-200 dark:border-slate-700 break-all whitespace-pre-wrap min-h-[40px] flex items-center">
                                {showSecret ? selectedApp.apiSecret : '•'.repeat(24)}
                            </code>
                        </div>
                        <button 
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
                            onClick={() => setShowSecret(!showSecret)}
                            title={showSecret ? "Hide" : "Show"}
                        >
                            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button 
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
                            onClick={() => navigator.clipboard.writeText(selectedApp.apiSecret)}
                            title="Copy"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
                        <span className="font-bold">Warning:</span> {t('apps.secretWarning')}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('apps.intelligence')}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-200">{t('apps.aiModel')}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('apps.aiModelDesc')}</p>
                    </div>
                    <code className="text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 font-mono">{selectedApp.aiModelConfig}</code>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-200">{t('apps.difyBinding')}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('apps.difyBindingDesc')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md min-w-[120px]">{selectedApp.difyAppId || '-'}</span>
                      {selectedApp.difyAppId && (
                        <span className="text-emerald-500 flex items-center gap-1 text-xs">
                          <Check size={14} /> {t('apps.verify')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('apps.webhooks')}</h3>
                </div>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                    <Globe className="text-slate-400" size={24} />
                  </div>
                  <h4 className="text-slate-900 dark:text-white font-medium">{t('apps.noWebhooks')}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{t('apps.noWebhooksDesc')}</p>
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">{t('apps.addEndpoint')}</button>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <AppWindow size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('apps.selectApp')}</p>
            <p className="text-sm">{t('apps.selectAppDesc')}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingApp.id ? t('apps.form.editTitle') : t('apps.form.createTitle')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {!editingApp.id && (
                <div className="space-y-3 mb-6">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                    {t('apps.form.selectTemplate')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'blank', name: t('apps.templates.blank'), icon: Layout, desc: t('apps.templates.blankDesc') },
                      { id: 'ecommerce', name: t('apps.templates.ecommerce'), icon: ShoppingCart, desc: t('apps.templates.ecommerceDesc') },
                      { id: 'ai_agent', name: t('apps.templates.aiAgent'), icon: Bot, desc: t('apps.templates.aiAgentDesc') },
                      { id: 'tooling', name: t('apps.templates.devTool'), icon: Wrench, desc: t('apps.templates.devToolDesc') },
                    ].map(tmpl => (
                      <div 
                        key={tmpl.id}
                        // @ts-ignore
                        onClick={() => setEditingApp({ ...editingApp, template: tmpl.id })}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${(editingApp as any).template === tmpl.id ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                      >
                        <div className={`p-2 rounded-md ${(editingApp as any).template === tmpl.id ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                          <tmpl.icon size={18} />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${(editingApp as any).template === tmpl.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>{tmpl.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{tmpl.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('apps.form.appName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingApp.name || ''}
                  onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={t('apps.placeholders.appName')}
                />
              </div>

              {!editingApp.id && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    App ID
                  </label>
                  <input
                    type="text"
                    // Use a temporary field or handle this specially since ID is usually auto-generated
                    // But user wants to specify it.
                    // We need to extend SaaSApp type or just cast it
                    value={(editingApp as any).customId || ''} 
                    onChange={(e) => setEditingApp({ ...editingApp, customId: e.target.value } as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder={t('apps.placeholders.customId')}
                  />
                  <p className="text-[10px] text-slate-400">{t('apps.hints.autoUUID')}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('apps.form.description')}</label>
                <textarea
                  rows={3}
                  value={editingApp.description || ''}
                  onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder={t('apps.placeholders.description')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('apps.form.status')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editingApp.status}
                  onChange={(e) => setEditingApp({ ...editingApp, status: e.target.value as AppStatus })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value={AppStatus.ACTIVE}>{t('apps.status.active')}</option>
                  <option value={AppStatus.DEVELOPMENT}>{t('apps.status.development')}</option>
                  <option value={AppStatus.SUSPENDED}>{t('apps.status.suspended')}</option>
                </select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('apps.form.ipWhitelist')}
                </label>
                <input
                  type="text"
                  value={editingApp.allowedIps || ''}
                  onChange={(e) => setEditingApp({ ...editingApp, allowedIps: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder={t('apps.placeholders.ipWhitelist')}
                />
              </div>

              {/* Dynamic Config Form */}
              <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                 <div className="flex items-center gap-2 mb-3">
                    <Settings className="text-indigo-600 dark:text-indigo-400" size={16} />
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">{t('apps.form.advancedConfig')}</label>
                 </div>
                 {configSchema ? (
                     <div className="rjsf-theme-custom">
                        <Form
                            schema={configSchema}
                            validator={validator}
                            formData={configFormData}
                            onChange={e => setConfigFormData(e.formData)}
                            uiSchema={{
                                "ui:submitButtonOptions": { norender: true } // Hide submit button, we use global save
                            }}
                            className="space-y-4"
                        />
                     </div>
                 ) : (
                     <p className="text-xs text-slate-500">Loading schema...</p>
                 )}
              </div>

              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none">
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('apps.actions.confirmDelete')}
        message={t('apps.actions.deleteConfirm')}
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmText={t('common.delete')}
      />
    </div>
  );
};

export default AppsPage;

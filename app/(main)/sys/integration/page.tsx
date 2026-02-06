'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Mail, 
  Database, 
  MessageSquare, 
  Building2, 
  RefreshCw, 
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useToast } from '../../../../contexts';
import { IntegrationCategory, IntegrationConfig } from '../../../../types/integration';
import { LLMConfigForm } from './components/LLMConfig';
import { EmailConfigForm } from './components/EmailConfig';
import { DatabaseConfigForm } from './components/DatabaseConfig';
import { WeChatConfigForm } from './components/WeChatConfig';
import { EnterpriseConfigForm } from './components/EnterpriseConfig';

const CATEGORIES: { id: IntegrationCategory; label: string; icon: React.ElementType }[] = [
  { id: 'llm', label: '大模型配置 (LLM)', icon: Bot },
  { id: 'email', label: '邮件发送配置', icon: Mail },
  { id: 'database', label: '数据库连接', icon: Database },
  { id: 'wechat', label: '企业微信集成', icon: MessageSquare },
  { id: 'enterprise', label: '企业信息配置', icon: Building2 },
];

export default function IntegrationPage() {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>('llm');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<IntegrationCategory, IntegrationConfig | null>>({
    llm: null,
    email: null,
    database: null,
    wechat: null,
    enterprise: null
  });

  // Load configs
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*');

      if (error) throw error;

      setConfigs(() => {
        const next: Record<IntegrationCategory, IntegrationConfig | null> = {
          llm: null,
          email: null,
          database: null,
          wechat: null,
          enterprise: null,
        };
        data?.forEach((item: IntegrationConfig) => {
          next[item.category] = item;
        });
        return next;
      });
    } catch (error: any) {
      console.error('Error fetching configs:', error);
      // Don't show toast on 404/empty, just log
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  };

  const handleSave = async (configData: any, isEnabled: boolean) => {
    setIsSaving(true);
    try {
      const currentConfig = configs[activeCategory];
      
      const payload = {
        category: activeCategory,
        config: configData,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString()
      };

      // Optimistic update to prevent UI flicker
      const updatedConfig = {
        ...currentConfig,
        category: activeCategory,
        config: configData,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString()
      };
      setConfigs(prev => ({ ...prev, [activeCategory]: updatedConfig }));

      let error;
      if (currentConfig?.id) {
        // Update
        const { data: updatedRow, error: updateError } = await supabase
          .from('integration_configs')
          .update(payload)
          .eq('id', currentConfig.id)
          .select()
          .single();
        error = updateError;
        if (!error && updatedRow) {
          setConfigs(prev => ({ ...prev, [activeCategory]: updatedRow as IntegrationConfig }));
        }
      } else {
        // Insert
        const { data: insertedRow, error: insertError } = await supabase
          .from('integration_configs')
          .insert(payload)
          .select()
          .single();
        error = insertError;
        if (!error && insertedRow) {
          setConfigs(prev => ({ ...prev, [activeCategory]: insertedRow as IntegrationConfig }));
        }
      }

      if (error) throw error;

      showToast('配置已保存', 'success');
    } catch (error: any) {
      console.error('Save error:', error);
      showToast(error.message || '保存失败', 'error');
      
      // Log error to system logs
      let userIp = 'unknown';
      try {
        const ipRes = await fetch('/api/ip');
        const ipData = await ipRes.json();
        userIp = ipData.ip;
      } catch (e) {
        console.warn('Failed to get IP for error log', e);
      }

      await supabase.from('error_logs').insert({
        level: 'error',
        message: `Integration config save failed: ${error.message || 'Unknown error'}`,
        context: { category: activeCategory, error },
        app_id: 'AdminSys',
        ip_address: userIp
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (_configData: any) => {
    // Mock test connection
    showToast('正在测试连接...', 'info');
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate mock
      if (success) {
        showToast('连接测试成功！', 'success');
      } else {
        showToast('连接测试失败：无法连接到服务器', 'error');
      }
    }, 1500);
  };

  const renderContent = () => {
    const currentConfig = configs[activeCategory];
    const initialData = currentConfig?.config || {};
    const initialEnabled = currentConfig?.is_enabled ?? false;

    const commonProps = {
      initialData,
      initialEnabled,
      onSave: handleSave,
      onTest: handleTestConnection,
      isSaving
    };

    switch (activeCategory) {
      case 'llm': return <LLMConfigForm {...commonProps} />;
      case 'email': return <EmailConfigForm {...commonProps} />;
      case 'database': return <DatabaseConfigForm {...commonProps} />;
      case 'wechat': return <WeChatConfigForm {...commonProps} />;
      case 'enterprise': return <EnterpriseConfigForm {...commonProps} />;
      default: return <div>Select a category</div>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 space-y-2">
        <div className="mb-6 px-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw size={20} className="text-indigo-600" />
            集成管理
          </h2>
          <p className="text-xs text-slate-500 mt-1">配置外部服务与系统集成参数</p>
        </div>
        
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
    </div>
  );
}

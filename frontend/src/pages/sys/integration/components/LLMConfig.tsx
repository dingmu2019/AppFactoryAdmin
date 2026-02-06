
import React, { useState } from 'react';
import { Eye, EyeOff, Save, Play, Globe, Plus, Trash2, Edit2, X, AlertTriangle, GripVertical, Clock } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LLMConfig, IntegrationConfig } from '../../../../types/integration';
import { useI18n } from '../../../../contexts';

interface Props {
  configs: IntegrationConfig[];
  onSave: (data: LLMConfig, enabled: boolean, id?: string, isSorting?: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (data: LLMConfig) => void;
  isSaving: boolean;
  onSort?: (newOrder: IntegrationConfig[]) => void;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'together', label: 'Together AI' },
  { value: 'fireworks', label: 'Fireworks AI' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'xai', label: 'xAI (Grok)' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'dashscope', label: 'Alibaba DashScope (Qwen)' },
  { value: 'qianfan', label: 'Baidu Qianfan' },
  { value: 'zhipu', label: 'Zhipu AI (GLM)' },
  { value: 'moonshot', label: 'Moonshot (Kimi)' },
];

const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (e) {
        return dateString;
    }
};

// Sortable Item Component
const SortableItem = ({ item, index, handleEdit, onDelete, configs }: any) => {
    const { t } = useI18n();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: isDragging ? 'relative' as const : undefined,
    };

    const conf = item.config as LLMConfig;

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`bg-white dark:bg-slate-900 p-5 rounded-xl border ${isDragging ? 'border-indigo-500 shadow-xl' : 'border-slate-200 dark:border-slate-800'} flex items-center justify-between group hover:border-indigo-500/50 transition-all shadow-sm mb-4`}
        >
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="text-slate-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing">
                    <GripVertical size={20} />
                </button>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                    item.is_enabled ? 'bg-indigo-600' : 'bg-slate-400'
                }`}>
                    {conf.provider?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white">{conf.model}</h3>
                        {/* Primary Label Logic: Explicit isPrimary flag or Fallback to first enabled */}
                        {(conf.isPrimary || (index === 0 && item.is_enabled && !configs.some((c: any) => (c.config as LLMConfig).isPrimary))) && (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
                                {t('integration.llm.primary')}
                            </span>
                        )}
                        {/* Enabled Label */}
                        {item.is_enabled && !(conf.isPrimary || (index === 0 && !configs.some((c: any) => (c.config as LLMConfig).isPrimary))) && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
                                {t('common.enabled')}
                            </span>
                        )}
                        {/* Disabled Label */}
                        {!item.is_enabled && (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full border border-slate-200 dark:border-slate-700">
                                {t('common.disabled')}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>{PROVIDERS.find(p => p.value === conf.provider)?.label || conf.provider}</span>
                        <span>•</span>
                        <span className="font-mono opacity-70">{conf.endpoint?.replace(/^https?:\/\//, '')}</span>
                        {item.updated_at && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1 opacity-70" title={t('common.updatedAt')}>
                                    <Clock size={10} />
                                    {formatDate(item.updated_at)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                    <Edit2 size={18} />
                </button>
                <button 
                    onClick={() => {
                        // Delegate delete to parent for custom confirmation
                        if (item.id) onDelete(item.id);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

export const LLMConfigForm: React.FC<Props> = ({ configs, onSave, onDelete, onTest, isSaving, onSort }) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultFormData: Partial<LLMConfig> = {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4',
    maxTokens: 2048,
    temperature: 0.7,
    apiKey: '',
    isPrimary: false,
  };

  const [formData, setFormData] = useState<Partial<LLMConfig>>(defaultFormData);
  const [isEnabled, setIsEnabled] = useState(true);
  const [showKey, setShowKey] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
        const oldIndex = configs.findIndex((item) => item.id === active.id);
        const newIndex = configs.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(configs, oldIndex, newIndex);
        if (onSort) onSort(newOrder);
    }
  };

  // ... (handleEdit, handleAdd, handleFormSave, handleChange) ...
  const handleEdit = (config: IntegrationConfig) => {
    setEditingId(config.id || null);
    setFormData({ ...defaultFormData, ...(config.config || {}) });
    setIsEnabled(config.is_enabled !== false);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setIsEnabled(true);
    setIsModalOpen(true);
  };

  const handleFormSave = () => {
    onSave(formData as LLMConfig, isEnabled, editingId || undefined);
    setIsModalOpen(false);
  };

  const handleChange = (field: keyof LLMConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isAzure = formData.provider === 'azure';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header ... */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <Globe className="text-indigo-600" size={24} />
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('integration.llm.title')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('integration.llm.subtitle')}</p>
            </div>
        </div>
        <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
        >
            <Plus size={18} />
            {t('integration.llm.addModel')}
        </button>
      </div>

      {/* Sortable Model List */}
      <div className="grid gap-4">
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={configs.map(c => c.id!)}
                strategy={verticalListSortingStrategy}
            >
                {configs.map((item, index) => (
                    <SortableItem 
                        key={item.id} 
                        item={item} 
                        index={index} 
                        handleEdit={handleEdit} 
                        onDelete={onDelete} 
                        configs={configs} // Pass configs for primary logic check
                    />
                ))}
            </SortableContext>
        </DndContext>

        {configs.length === 0 && (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
                <Globe size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t('integration.llm.noModels')}</p>
                <button onClick={handleAdd} className="text-indigo-600 hover:underline mt-2">{t('integration.llm.addFirst')}</button>
            </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-slate-100 dark:border-slate-800">
                {/* ... Header ... */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingId ? t('integration.llm.editModel') : t('integration.llm.addModel')}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Enable Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                <Play size={16} fill="currentColor" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">{t('integration.llm.enableModel')}</div>
                                <div className="text-xs text-slate-500">{t('integration.llm.enableDesc')}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsEnabled(!isEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${
                                isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    {/* Primary Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.isPrimary ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                <Globe size={16} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">{t('integration.llm.setPrimary')}</div>
                                <div className="text-xs text-slate-500">{t('integration.llm.primaryDesc')}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleChange('isPrimary', !formData.isPrimary)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${
                                formData.isPrimary ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                formData.isPrimary ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    {/* ... Existing Fields ... */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.llm.provider')}</label>
                            <select
                                value={formData.provider ?? 'openai'}
                                onChange={(e) => handleChange('provider', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            >
                                {PROVIDERS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.llm.modelName')}</label>
                            <input
                                type="text"
                                value={formData.model ?? ''}
                                onChange={(e) => handleChange('model', e.target.value)}
                                placeholder="gpt-4, gemini-1.5-pro..."
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                            {t('integration.llm.baseUrl')}
                        </label>
                        <input
                            type="text"
                            value={formData.endpoint ?? ''}
                            onChange={(e) => handleChange('endpoint', e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        {isAzure && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                {t('integration.llm.azureHint')}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.llm.apiKey')}</label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={formData.apiKey ?? ''}
                                onChange={(e) => handleChange('apiKey', e.target.value)}
                                placeholder="sk-..."
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.llm.maxTokens')}</label>
                            <input
                                type="number"
                                value={formData.maxTokens ?? 0}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  handleChange('maxTokens', Number.isFinite(v) ? v : 0);
                                }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.llm.temperature')}</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                value={formData.temperature ?? 0.7}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  handleChange('temperature', Number.isFinite(v) ? v : 0.7);
                                }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
                    <button
                        onClick={() => onTest(formData as LLMConfig)}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Play size={16} />
                        {t('common.test')}
                    </button>
                    <button
                        onClick={handleFormSave}
                        disabled={isSaving}
                        className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

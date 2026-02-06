import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, MessageSquare, Bot, Edit2 } from 'lucide-react';
import type { Agent } from './AgentCard';
import { useToast } from '../../../../contexts';
import { AgentAvatar, AGENT_ICON_OPTIONS } from '../../../../components/AgentAvatar';
import { 
  createAgent, 
  updateAgent, 
  getAgentPrompts, 
  upsertAgentPrompts, 
  deleteAgentPrompt 
} from '../../../../services/agentService';

const isAbortError = (err: any) => {
  const name = err?.name;
  const message = err?.message;
  return name === 'AbortError' || message === 'AbortError' || /aborted/i.test(String(message || ''));
};

interface AgentFormProps {
  initialData?: Agent;
  onClose: () => void;
  onSuccess: () => void;
}

interface PromptItem {
    id?: string;
    label: string;
    content: string;
}

export const AgentForm: React.FC<AgentFormProps> = ({ initialData, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'config' | 'prompts'>('config');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const buildAgentPayload = (data: Partial<Agent>) => ({
    name: data.name || '',
    role: data.role || '',
    avatar: data.avatar || 'Bot',
    description: data.description || '',
    system_prompt: data.system_prompt || '',
    is_active: typeof data.is_active === 'boolean' ? data.is_active : true
  });

  // Basic Config
  const [formData, setFormData] = useState<Partial<Agent>>(() => buildAgentPayload(initialData || {}));

  useEffect(() => {
    setFormData(buildAgentPayload(initialData || {}));
  }, [initialData]);

  // Prompts
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [newPrompt, setNewPrompt] = useState<PromptItem>({ label: '', content: '' });
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);

  // State for avatar picker visibility
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Fetch prompts if editing
  useEffect(() => {
    if (initialData?.id) {
        const fetchPrompts = async () => {
            try {
              const data = await getAgentPrompts(initialData.id);
              if (data) setPrompts(data);
            } catch (err: any) {
              if (isAbortError(err)) return;
              showToast(err?.message || 'Failed to load prompts', 'error');
            }
        };
        fetchPrompts();
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.system_prompt) {
        showToast('Please fill in required fields', 'error');
        return;
    }

    setIsSubmitting(true);
    try {
        let agentId = initialData?.id;
        const agentPayload = buildAgentPayload(formData);

        // 1. Save Agent
        let savedAgent;
        if (agentId) {
             savedAgent = await updateAgent(agentId, agentPayload);
        } else {
             savedAgent = await createAgent(agentPayload);
        }
        
        agentId = savedAgent.id;

        // 2. Save Prompts
        if (prompts.length > 0 && agentId) {
             await upsertAgentPrompts(agentId, prompts);
        }

        // Handle deletions if needed (not implemented in this simple version)

        showToast('Agent saved successfully', 'success');
        onSuccess();
    } catch (error: any) {
        if (isAbortError(error)) return;
        showToast(error.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddPrompt = () => {
      if (!newPrompt.label || !newPrompt.content) return;
      
      if (editingPromptIndex !== null) {
          // Update existing
          const updatedPrompts = [...prompts];
          updatedPrompts[editingPromptIndex] = { ...newPrompt, id: prompts[editingPromptIndex].id }; // Keep ID
          setPrompts(updatedPrompts);
          setEditingPromptIndex(null);
      } else {
          // Add new
          setPrompts([...prompts, { ...newPrompt }]);
      }
      setNewPrompt({ label: '', content: '' });
  };

  const handleEditPrompt = (index: number) => {
      setNewPrompt(prompts[index]);
      setEditingPromptIndex(index);
  };

  const handleDeletePrompt = async (index: number) => {
      const prompt = prompts[index];
      if (prompt.id && initialData?.id) {
          // If it has ID, delete from DB
          try {
             await deleteAgentPrompt(initialData.id, prompt.id);
          } catch(err) {
             showToast('Failed to delete prompt', 'error');
             return; 
          }
      }
      const newPrompts = [...prompts];
      newPrompts.splice(index, 1);
      setPrompts(newPrompts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    {initialData ? <Edit2 size={24} /> : <Bot size={24} />}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {initialData ? '编辑 AI Agent' : '新建 AI Agent'}
                </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <button
                onClick={() => setActiveTab('config')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'config'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
                基础配置
            </button>
            <button
                onClick={() => setActiveTab('prompts')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'prompts'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
                常用提示词 ({prompts.length})
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'config' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Agent 名称 *</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="例如：高级产品经理"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">角色/头衔</label>
                            <input 
                                type="text" 
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value})}
                                placeholder="例如：Product Expert"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">头像 (Icon)</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <AgentAvatar name={formData.avatar} size={20} />
                                        </div>
                                        <span className="text-sm font-medium">{formData.avatar || 'Bot'}</span>
                                    </div>
                                    <span className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">点击更换</span>
                                </button>
                                
                                {showEmojiPicker && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setShowEmojiPicker(false)}
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-2 z-20 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto custom-scrollbar p-1">
                                                {AGENT_ICON_OPTIONS.map(icon => (
                                                    <button
                                                        key={icon}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({...formData, avatar: icon});
                                                            setShowEmojiPicker(false);
                                                        }}
                                                        className={`w-10 h-10 flex items-center justify-center rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 ${
                                                            formData.avatar === icon ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-400' : ''
                                                        }`}
                                                        title={icon}
                                                    >
                                                        <AgentAvatar name={icon} size={20} />
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center px-1">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">选择一个图标</span>
                                                <span className="text-[10px] text-slate-400">{AGENT_ICON_OPTIONS.length} 个可用</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">状态</label>
                            <div className="flex items-center gap-4 py-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={formData.is_active} 
                                        onChange={() => setFormData({...formData, is_active: true})}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">启用</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={!formData.is_active} 
                                        onChange={() => setFormData({...formData, is_active: false})}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">停用</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">功能描述</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder="简要描述该 Agent 的主要职责..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>系统提示词 (System Prompt) *</span>
                            <span className="text-xs font-normal text-slate-400">定义 Agent 的行为逻辑</span>
                        </label>
                        <textarea 
                            value={formData.system_prompt}
                            onChange={e => setFormData({...formData, system_prompt: e.target.value})}
                            placeholder="你是一位资深的产品经理，擅长需求分析..."
                            rows={10}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Add Prompt */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4 border border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus size={16} className="text-indigo-600" />
                                {editingPromptIndex !== null ? '编辑提示词' : '添加常用提示词'}
                            </h3>
                            <div className="space-y-3">
                                <input 
                                    type="text" 
                                    value={newPrompt.label}
                                    onChange={e => setNewPrompt({...newPrompt, label: e.target.value})}
                                    placeholder="标题 (例如: 优化需求)"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <textarea 
                                    value={newPrompt.content}
                                    onChange={e => setNewPrompt({...newPrompt, content: e.target.value})}
                                    placeholder="提示词内容..."
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                    {editingPromptIndex !== null && (
                                        <button 
                                            onClick={() => {
                                                setEditingPromptIndex(null);
                                                setNewPrompt({ label: '', content: '' });
                                            }}
                                            className="px-4 py-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors"
                                        >
                                            取消
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleAddPrompt}
                                        disabled={!newPrompt.label || !newPrompt.content}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        {editingPromptIndex !== null ? '保存修改' : '添加'}
                                    </button>
                                </div>
                            </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        {prompts.map((prompt, idx) => (
                            <div key={idx} className="group flex items-start justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={14} className="text-indigo-500" />
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">{prompt.label}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {prompt.content}
                                    </p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => handleEditPrompt(idx)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                        title="编辑"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePrompt(idx)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                                        title="删除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {prompts.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                暂无常用提示词
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
                取消
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Save size={18} />
                )}
                保存配置
            </button>
        </div>
      </div>
    </div>
  );
};

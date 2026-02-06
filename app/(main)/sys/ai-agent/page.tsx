'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Plus, Search, SlidersHorizontal, RefreshCw, AlertCircle } from 'lucide-react';
import { useI18n, useToast } from '../../../../contexts';
import { supabase } from '../../../../lib/supabase';
import { AgentCard, Agent } from './components/AgentCard';
import { AgentForm } from './components/AgentForm';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function AIAgentPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; agent: Agent | null }>({ isOpen: false, agent: null });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Agents
  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      // Fetch agents
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch prompt counts
      // Note: In a real app, this should be a joined query or view for performance
      const agentsWithCounts = await Promise.all((data || []).map(async (agent) => {
          const { count } = await supabase
            .from('agent_prompts')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id);
          return { ...agent, prompts_count: count || 0 };
      }));

      setAgents(agentsWithCounts);
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      showToast('Failed to load agents', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Handlers
  const handleCreate = () => {
    setEditingAgent(undefined);
    setShowForm(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (agent) {
      setDeleteConfirm({ isOpen: true, agent });
    }
  };

  const confirmDelete = async () => {
    const agent = deleteConfirm.agent;
    if (!agent) return;

    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agent.id);

      if (error) throw error;
      
      setAgents(prev => prev.filter(a => a.id !== agent.id));
      showToast('Agent deleted successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, agent: null });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        const { error } = await supabase
            .from('ai_agents')
            .update({ is_active: !currentStatus })
            .eq('id', id);
            
        if (error) throw error;
        
        // Optimistic update
        setAgents(agents.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
        showToast(`Agent ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
    } catch (error: any) {
        console.error('Status update error:', error);
        showToast('Failed to update status', 'error');
    }
  };

  const handleFormSuccess = () => {
      setShowForm(false);
      fetchAgents();
  };

  // Filter
  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
             <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                <Bot size={24} />
             </div>
             {t('common.aiAgentManagement')}
           </h2>
           <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
             管理您的 AI 智能助手，定义角色与能力，赋能业务场景。
           </p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={fetchAgents}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Refresh"
             >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button 
                onClick={handleCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <Plus size={20} />
                新建 Agent
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="搜索 Agent 名称或角色..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
        <div className="flex items-center gap-2">
            {/* Filter Placeholder - Can be expanded */}
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <SlidersHorizontal size={18} />
                <span className="text-sm font-medium">筛选</span>
            </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
          <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
      ) : filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Bot size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">暂无 Agent</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                  还没有配置任何 AI 助手。点击上方按钮创建一个新的 Agent 来开始使用。
              </p>
              <button 
                onClick={handleCreate}
                className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                  立即创建
              </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredAgents.map(agent => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
              ))}
          </div>
      )}

      {/* Form Modal */}
      {showForm && (
          <AgentForm 
            initialData={editingAgent} 
            onClose={() => setShowForm(false)}
            onSuccess={handleFormSuccess}
          />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Agent"
        message={`Are you sure you want to delete "${deleteConfirm.agent?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, agent: null })}
        confirmText="Delete"
      />
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, Search, SlidersHorizontal, RefreshCw, Zap } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useI18n, useToast, usePageHeader } from '../../../contexts';
import { AgentCard } from './components/AgentCard';
import type { Agent } from './components/AgentCard';
import { AgentForm } from './components/AgentForm';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { 
  getAgents, 
  deleteAgent as deleteAgentApi, 
  toggleAgentStatus as toggleAgentStatusApi,
  reorderAgents as reorderAgentsApi
} from '../../../services/agentService';

export default function AIAgentPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const isMountedRef = useRef(true);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  
  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid accidental drags when clicking buttons
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ... (rest of the component)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(1);

  // Fetch Agents
  const fetchAgents = async (silent = false) => {
    if (isMountedRef.current && !silent) setIsLoading(true);
    try {
      const data = await getAgents();
      if (isMountedRef.current) setAgents(data);
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (error?.name === 'AbortError' || /aborted/i.test(msg)) {
        return;
      }
      showToast('Failed to load agents', 'error');
    } finally {
      if (isMountedRef.current && !silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    setPageHeader(t('common.aiAgentManagement'), t('agents.subtitle'));
  }, [setPageHeader, t]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAgents();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Stats (Derived state)
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.is_active).length;

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
    setAgentToDelete(id);
    setDeleteStep(1);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;

    if (deleteStep === 1) {
        setDeleteStep(2);
        return;
    }

    try {
      await deleteAgentApi(agentToDelete);
      
      showToast('Agent deleted successfully (Soft Delete)', 'success');
      fetchAgents(true);
    } catch (error: any) {
      console.error('Delete error:', error);
      showToast('Failed to delete agent', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setAgentToDelete(null);
      setDeleteStep(1);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        await toggleAgentStatusApi(id, !currentStatus);
            
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
      fetchAgents(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = agents.findIndex((i) => i.id === active.id);
      const newIndex = agents.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(agents, oldIndex, newIndex);
      
      // Optimistic update
      const originalItems = [...agents];
      setAgents(newItems);
      
      try {
        await reorderAgentsApi(newItems.map(i => i.id));
      } catch (err) {
        console.error('Reorder error:', err);
        showToast('Failed to save new order', 'error');
        // Revert on failure but don't call fetchAgents to avoid "refresh" feel
        setAgents(originalItems);
      }
    }
  };

  // Filter
  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
            {/* Stat Card 1: Total */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[120px]">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Bot size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('agents.total')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{totalAgents}</div>
                 </div>
            </div>

            {/* Stat Card 2: Active */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[120px]">
                 <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <Zap size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('agents.active')}</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none">{activeAgents}</div>
                 </div>
            </div>

            {/* Refresh Button */}
            <button 
                onClick={() => fetchAgents()}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors h-[52px] w-[52px] flex items-center justify-center"
                title={t('agents.refresh')}
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* Create Button */}
            <button 
                onClick={handleCreate}
                className="flex items-center gap-2 px-5 h-[52px] bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <Plus size={20} />
                {t('agents.create')}
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder={t('agents.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
        <div className="flex items-center gap-2">
            {/* Filter Placeholder - Can be expanded */}
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <SlidersHorizontal size={18} />
                <span className="text-sm font-medium">{t('agents.filter')}</span>
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('agents.noAgents')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                  {t('agents.noAgentsDesc')}
              </p>
              <button 
                onClick={handleCreate}
                className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                  {t('agents.createNow')}
              </button>
          </div>
      ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredAgents.map(a => a.id)}
              strategy={rectSortingStrategy}
            >
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
            </SortableContext>
          </DndContext>
      )}

      {/* Form Modal */}
      {showForm && (
          <AgentForm 
            initialData={editingAgent} 
            onClose={() => setShowForm(false)}
            onSuccess={handleFormSuccess}
          />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeleteStep(1); }}
        onConfirm={confirmDelete}
        title={deleteStep === 1 ? t('agents.delete.title') : t('agents.delete.finalTitle')}
        message={deleteStep === 1 
            ? t('agents.delete.message')
            : t('agents.delete.finalMessage')}
        confirmText={deleteStep === 1 ? t('agents.delete.continue') : t('agents.delete.confirm')}
        cancelText={t('common.cancel')}
        preventAutoClose={deleteStep === 1}
      />
    </div>
  );
}

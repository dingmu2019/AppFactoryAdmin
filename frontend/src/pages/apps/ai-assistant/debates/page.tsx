
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Clock, Zap, Play, Search, RefreshCw, Trash2 } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '../../../../contexts';
import { supabase } from '../../../../lib/supabase';
import { ConfirmModal } from '../../../../components/ConfirmModal';

interface Debate {
  id: string;
  topic: string;
  mode: string;
  duration_limit: number;
  entropy: number;
  status: string;
  created_at: string;
  participants: any[];
}

export default function DebateListPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  
  useEffect(() => {
    setPageHeader(t('common.ai.debatesPage.title'), t('common.ai.debatesPage.subtitle'));
  }, [setPageHeader, t]);

  const [debates, setDebates] = useState<Debate[]>([]);
  const [filteredDebates, setFilteredDebates] = useState<Debate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Create Form State
  const [newTopic, setNewTopic] = useState('');
  const [newMode, setNewMode] = useState<'free_discussion' | 'debate'>('free_discussion');
  const [newDuration, setNewDuration] = useState(5);
  const [newEntropy, setNewEntropy] = useState(0.5);
  const [newParticipantsCount, setNewParticipantsCount] = useState(5);
  // Default to true as per Jobs' "It just works" philosophy
  const [enableAwareness] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchDebates = async () => {
    setIsLoading(true);
    try {
      // Use Backend API proxy if RLS or complex logic, or direct Supabase if allowed
      // Direct Supabase is fine for read if RLS is set
      const { data, error } = await supabase
        .from('agent_debates')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setDebates(data || []);
      setFilteredDebates(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      showToast('加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebates();
  }, []);

  useEffect(() => {
    let res = debates;
    if (searchTerm) {
      res = res.filter(d => d.topic.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      res = res.filter(d => d.status === statusFilter);
    }
    setFilteredDebates(res);
  }, [debates, searchTerm, statusFilter]);

  const handleCreate = async () => {
    if (!newTopic.trim()) return;
    
    // --- Optimistic UI: Immediately close modal and show success ---
    // In a real app, we would add a temporary item to the list with a 'creating' state
    // For now, we just make the UI feel instant.
    setIsCreating(true); // Keep internal state for safety
    setShowCreateModal(false);
    showToast(t('common.success'), 'success'); // Optimistic Toast
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch('/api/ai/debates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                topic: newTopic,
                mode: newMode,
                duration: newDuration,
                entropy: newEntropy,
                participants_count: newParticipantsCount,
                enable_environment_awareness: enableAwareness
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to create');
        }

        const newDebate = await response.json();
        // Navigate to detail
        navigate(`/ai-debates/${newDebate.id}`);
    } catch (error: any) {
        console.error(error);
        // Revert optimistic update
        setShowCreateModal(true); // Re-open modal so user doesn't lose input
        showToast(`${t('common.error')}: ${error.message}`, 'error');
    } finally {
        setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('agent_debates')
        .update({ deleted_at: nowIso, updated_at: nowIso })
        .eq('id', pendingDeleteId)
        .is('deleted_at', null)
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Delete failed');
      }

      setDebates(prev => prev.filter(d => d.id !== pendingDeleteId));
      showToast(t('common.success'), 'success');
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
      const styles: any = {
          pending: 'bg-slate-100 text-slate-500',
          running: 'bg-indigo-50 text-indigo-600 animate-pulse',
          completed: 'bg-emerald-50 text-emerald-600',
          terminated: 'bg-rose-50 text-rose-600',
          error: 'bg-rose-50 text-rose-600'
      };
      const labels: any = {
          pending: t('common.ai.debatesPage.status.pending'),
          running: t('common.ai.debatesPage.status.running'),
          completed: t('common.ai.debatesPage.status.completed'),
          terminated: t('common.ai.debatesPage.status.terminated'),
          error: t('common.ai.debatesPage.status.error')
      };
      return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.pending}`}>
              {labels[status] || status}
          </span>
      );
  };

  const totalDebates = debates.length;
  const runningDebates = debates.filter(d => d.status === 'running').length;

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
            {/* Stat Card 1: Total */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[120px]">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <MessageSquare size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('common.all')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{totalDebates}</div>
                 </div>
            </div>

            {/* Stat Card 2: Running */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[120px]">
                 <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                    <Zap size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('common.ai.debatesPage.status.running')}</div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-none">{runningDebates}</div>
                 </div>
            </div>

            {/* Refresh Button */}
            <button 
                onClick={fetchDebates}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors h-[52px] w-[52px] flex items-center justify-center"
                title={t('common.refresh')}
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* Create Button */}
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 h-[52px] bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <Plus size={20} />
                {t('common.ai.debatesPage.create')}
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder={t('common.ai.debatesPage.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
        <div className="flex items-center gap-2">
            <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors outline-none cursor-pointer appearance-none"
            >
                <option value="all">{t('common.ai.debatesPage.status.all')}</option>
                <option value="running">{t('common.ai.debatesPage.status.running')}</option>
                <option value="completed">{t('common.ai.debatesPage.status.completed')}</option>
                <option value="pending">{t('common.ai.debatesPage.status.pending')}</option>
            </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {isLoading ? (
              // Skeleton Screen
              [...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse">
                      <div className="flex justify-between items-start mb-3">
                          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      </div>
                      <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                      <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                      <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                      <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                          <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      </div>
                  </div>
              ))
          ) : filteredDebates.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('common.ai.debatesPage.noData')}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                      {t('common.ai.debatesPage.noDataDesc')}
                  </p>
                  <button onClick={() => setShowCreateModal(true)} className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                      {t('common.ai.debatesPage.create')}
                  </button>
              </div>
          ) : (
              filteredDebates.map(debate => (
                  <div 
                    key={debate.id}
                    onClick={() => navigate(`/ai-debates/${debate.id}`)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group"
                  >
                      <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2">
                              {getStatusBadge(debate.status)}
                              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                  {debate.mode === 'debate' ? '激烈辩论' : '自由讨论'}
                              </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(debate.id);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors opacity-0 group-hover:opacity-100"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
                      
                      <h3
                        className="font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors h-[72px]"
                        title={debate.topic}
                      >
                          {debate.topic}
                      </h3>

                      <div className="mb-4 text-xs text-slate-400">
                          {new Date(debate.created_at).toLocaleString()}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                              <Clock size={12} className="text-slate-400" />
                              {debate.duration_limit} min
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                              <Zap size={12} className={debate.entropy > 0.7 ? "text-amber-500" : "text-slate-400"} />
                              {(debate.entropy * 100).toFixed(0)}%
                          </div>
                          <div className="ml-auto flex -space-x-2">
                              {[...Array(Math.min(3, debate.participants?.length || 0))].map((_, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-slate-500">
                                      AI
                                  </div>
                              ))}
                              {(debate.participants?.length || 0) > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-slate-500">
                                      +{debate.participants.length - 3}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('common.ai.debatesPage.create')}</h3>
                  </div>
                  <div className="p-6 space-y-5">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('common.ai.debatesPage.topic')}</label>
                          <textarea 
                              value={newTopic}
                              onChange={e => setNewTopic(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                              placeholder={t('common.ai.debatesPage.topicPlaceholder')}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('common.ai.debatesPage.mode')}</label>
                              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                  <button 
                                    onClick={() => setNewMode('free_discussion')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${newMode === 'free_discussion' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}
                                  >
                                      {t('common.ai.debatesPage.free')}
                                  </button>
                                  <button 
                                    onClick={() => setNewMode('debate')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${newMode === 'debate' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}
                                  >
                                      {t('common.ai.debatesPage.debate')}
                                  </button>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('common.ai.debatesPage.duration')}</label>
                              <input 
                                  type="number"
                                  min="1"
                                  max="60"
                                  value={newDuration}
                                  onChange={e => setNewDuration(parseInt(e.target.value))}
                                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">参与者数量 (默认5，最大20)</label>
                          <input 
                              type="number"
                              min="2"
                              max="20"
                              value={newParticipantsCount}
                              onChange={e => setNewParticipantsCount(Math.min(20, Math.max(2, parseInt(e.target.value) || 5)))}
                              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>

                      <div>
                          <div className="flex justify-between mb-1.5">
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.ai.debatesPage.entropy')}</label>
                              <span className="text-xs text-slate-500">{Math.round(newEntropy * 100)}%</span>
                          </div>
                          <input 
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={newEntropy}
                              onChange={e => setNewEntropy(parseFloat(e.target.value))}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <p className="text-xs text-slate-400 mt-1">
                              {t('common.ai.debatesPage.entropyDesc')}
                          </p>
                      </div>

                      {/* --- Active Awareness (Ambient) --- */}
                      {/* Hidden Toggle: "Users don't care about your database schema." - Jobs */}
                      {/* But we keep a subtle indicator that the system is "Alive" */}
                      <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium opacity-80">
                          <Zap size={12} className="fill-current animate-pulse" />
                          <span>System Awareness Active</span>
                      </div>
                      {/* ----------------------------------------------- */}
                  </div>
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                      <button 
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                          {t('common.cancel')}
                      </button>
                      <button 
                        onClick={handleCreate}
                        disabled={isCreating || !newTopic.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all"
                      >
                          {isCreating ? <span className="animate-spin">⏳</span> : <Play size={16} />}
                          {t('common.ai.debatesPage.start')}
                      </button>
                  </div>
              </div>
          </div>
      )}
      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title={t('common.confirmDelete')}
        message={t('common.ai.debatesPage.deleteConfirm')}
        confirmText={isDeleting ? t('common.deleting') : t('common.delete')}
        cancelText={t('common.cancel')}
        preventAutoClose={true}
        onConfirm={handleDelete}
        onClose={() => {
          if (!isDeleting) setPendingDeleteId(null);
        }}
      />
    </div>
  );
}

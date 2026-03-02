
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FlaskConical, Clock, Zap, Play, Search, RefreshCw, Trash2, Microscope, FileJson, TrendingUp } from 'lucide-react';
import { useToast, usePageHeader, useI18n } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';
import { authenticatedFetch } from '@/lib/http';

interface LabSession {
  id: string;
  title: string;
  mode: 'architect_blueprint' | 'market_simulation' | 'factory_optimization';
  status: string;
  created_at: string;
  config: any;
}

export default function AILabPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const { t } = useI18n();
  
  useEffect(() => {
    setPageHeader(t('ailab.title'), t('ailab.subtitle'));
  }, [setPageHeader, t]);

  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<LabSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMode, setNewMode] = useState<'architect_blueprint' | 'market_simulation' | 'factory_optimization'>('architect_blueprint');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/ai/lab/sessions');
      
      // Handle HTML error responses (like 404 or 500 from proxy/server)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
          throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
          if (response.status === 404) {
             setSessions([]);
             setFilteredSessions([]);
             return;
          }
          throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data || []);
      setFilteredSessions(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let res = sessions;
    if (searchTerm) {
      res = res.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredSessions(res);
  }, [sessions, searchTerm]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    setIsCreating(true);
    try {
        const response = await authenticatedFetch('/api/ai/lab/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: newTitle,
                mode: newMode,
                description: newDescription,
                entropy: 0.5
            })
        });

        // Handle HTML error responses
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
            throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || t('common.createFailed'));
        }

        const newSession = await response.json();
        showToast(t('common.createSuccess'), 'success');
        setShowCreateModal(false);
        // Navigate to detail
        router.push(`/apps/ai-lab/${newSession.id}`);
    } catch (error: any) {
        console.error(error);
        showToast(`${t('common.createFailed')}: ${error.message}`, 'error');
    } finally {
        setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    // Delete logic via Supabase directly or API
    // For MVP, assume RLS allows direct delete
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ai_lab_sessions')
        .delete()
        .eq('id', pendingDeleteId);

      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== pendingDeleteId));
      showToast(t('common.deleteSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('common.deleteFailed'), 'error');
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const getModeIcon = (mode: string) => {
      switch (mode) {
          case 'architect_blueprint': return <FileJson size={18} className="text-indigo-500" />;
          case 'market_simulation': return <TrendingUp size={18} className="text-emerald-500" />;
          case 'factory_optimization': return <Zap size={18} className="text-amber-500" />;
          default: return <FlaskConical size={18} className="text-zinc-500" />;
      }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
        case 'architect_blueprint': return t('ailab.modes.architect_blueprint');
        case 'market_simulation': return t('ailab.modes.market_simulation');
        case 'factory_optimization': return t('ailab.modes.factory_optimization');
        default: return mode;
    }
};

  const getModeTip = (mode: string) => {
    switch (mode) {
        case 'architect_blueprint':
            return (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg text-sm">
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                        <Microscope size={16} /> {t('ailab.tips.bestPractice')}
                    </h4>
                    <p className="text-indigo-900 dark:text-indigo-200 mb-2">
                        <strong>{t('ailab.tips.scenario')}：</strong> {t('ailab.examples.architect.scenario')}
                    </p>
                    <p className="text-indigo-900 dark:text-indigo-200 mb-2">
                         <strong>{t('ailab.tips.targetDesc')}：</strong> “{t('ailab.examples.architect.target')}”
                    </p>
                    <ul className="list-disc list-inside text-indigo-800 dark:text-indigo-300 space-y-1">
                        <li>{t('ailab.examples.architect.bullet1')}</li>
                        <li>{t('ailab.examples.architect.bullet2')}</li>
                        <li>{t('ailab.examples.architect.bullet3')}</li>
                        <li>{t('ailab.examples.architect.bullet4')}</li>
                    </ul>
                </div>
            );
        case 'market_simulation':
            return (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg text-sm">
                    <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                        <Microscope size={16} /> {t('ailab.tips.bestPractice')}
                    </h4>
                    <p className="text-emerald-900 dark:text-emerald-200 mb-2">
                        <strong>{t('ailab.tips.scenario')}：</strong> {t('ailab.examples.market.scenario')}
                    </p>
                    <p className="text-emerald-900 dark:text-emerald-200 mb-2">
                        <strong>{t('ailab.tips.targetDesc')}：</strong> “{t('ailab.examples.market.target')}”
                    </p>
                    <ul className="list-disc list-inside text-emerald-800 dark:text-emerald-300 space-y-1">
                        <li>{t('ailab.examples.market.bullet1')}</li>
                        <li>{t('ailab.examples.market.bullet2')}</li>
                        <li>{t('ailab.examples.market.bullet3')}</li>
                        <li>{t('ailab.examples.market.bullet4')}</li>
                    </ul>
                </div>
            );
        case 'factory_optimization':
            return (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm">
                    <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                        <Microscope size={16} /> {t('ailab.tips.bestPractice')}
                    </h4>
                    <p className="text-amber-900 dark:text-amber-200 mb-2">
                        <strong>{t('ailab.tips.scenario')}：</strong> {t('ailab.examples.factory.scenario')}
                    </p>
                    <p className="text-amber-900 dark:text-amber-200 mb-2">
                        <strong>{t('ailab.tips.targetDesc')}：</strong> “{t('ailab.examples.factory.target')}”
                    </p>
                    <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-1">
                        <li>{t('ailab.examples.factory.bullet1')}</li>
                        <li>{t('ailab.examples.factory.bullet2')}</li>
                        <li>{t('ailab.examples.factory.bullet3')}</li>
                        <li>{t('ailab.examples.factory.bullet4')}</li>
                    </ul>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
            {/* Stat Card */}
            <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[150px]">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FlaskConical size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('ailab.totalSessions')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white leading-none">{sessions.length}</div>
                 </div>
            </div>

            {/* Refresh Button */}
            <button 
                onClick={fetchSessions}
                className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors h-[52px] w-[52px] flex items-center justify-center"
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* Create Button */}
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 h-[52px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <Plus size={20} />
                {t('ailab.createSession')}
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
                type="text" 
                placeholder={t('ailab.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {isLoading ? (
              <div className="col-span-full py-20 text-center">
                  <RefreshCw className="animate-spin mx-auto mb-4 text-zinc-300" size={40} />
                  <div className="text-zinc-500 font-bold">{t('common.loading')}</div>
              </div>
          ) : filteredSessions.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Microscope size={32} className="text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">{t('ailab.noData')}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-center max-w-sm">
                      {t('ailab.noDataDesc')}
                  </p>
                  <button onClick={() => setShowCreateModal(true)} className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                      {t('ailab.createNow')}
                  </button>
              </div>
          ) : (
              filteredSessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => router.push(`/apps/ai-lab/${session.id}`)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer group flex flex-col min-h-[220px]"
                  >
                      <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2 items-center">
                              <span className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                                {getModeIcon(session.mode)}
                              </span>
                              <span className="text-xs font-medium text-zinc-500">
                                {getModeLabel(session.mode)}
                              </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(session.id);
                            }}
                            className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors opacity-0 group-hover:opacity-100"
                            title={t('common.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
                      
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors h-12">
                          {session.title}
                      </h3>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2 h-8">
                        {session.config.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-zinc-500 mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-zinc-400" />
                              {new Date(session.created_at).toLocaleDateString()}
                          </div>
                          <div className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              session.status === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                              {session.status}
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('ailab.form.title')}</h3>
                  </div>
                  <div className="p-6 space-y-5 overflow-y-auto flex-1">
                      <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('ailab.form.sessionTitle')}</label>
                          <input 
                              type="text"
                              value={newTitle}
                              onChange={e => setNewTitle(e.target.value)}
                              className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder={t('ailab.form.sessionTitlePlaceholder')}
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('ailab.form.sessionMode')}</label>
                          <div className="grid grid-cols-1 gap-2">
                              <button 
                                onClick={() => setNewMode('architect_blueprint')}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                    newMode === 'architect_blueprint' 
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' 
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                }`}
                              >
                                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                                      <FileJson size={20} className="text-indigo-500" />
                                  </div>
                                  <div>
                                      <div className="font-medium text-zinc-900 dark:text-white">{t('ailab.modes.architect_blueprint')}</div>
                                      <div className="text-xs text-zinc-500">{t('ailab.modes.architect_blueprint_desc')}</div>
                                  </div>
                              </button>

                              <button 
                                onClick={() => setNewMode('market_simulation')}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                    newMode === 'market_simulation' 
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' 
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                }`}
                              >
                                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                                      <TrendingUp size={20} className="text-emerald-500" />
                                  </div>
                                  <div>
                                      <div className="font-medium text-zinc-900 dark:text-white">{t('ailab.modes.market_simulation')}</div>
                                      <div className="text-xs text-zinc-500">{t('ailab.modes.market_simulation_desc')}</div>
                                  </div>
                              </button>
                              
                              <button 
                                onClick={() => setNewMode('factory_optimization')}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                    newMode === 'factory_optimization' 
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500' 
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                }`}
                              >
                                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                                      <Zap size={20} className="text-amber-500" />
                                  </div>
                                  <div>
                                      <div className="font-medium text-zinc-900 dark:text-white">{t('ailab.modes.factory_optimization')}</div>
                                      <div className="text-xs text-zinc-500">{t('ailab.modes.factory_optimization_desc')}</div>
                                  </div>
                              </button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('ailab.form.sessionDesc')}</label>
                          <textarea 
                              value={newDescription}
                              onChange={e => setNewDescription(e.target.value)}
                              className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 mb-4"
                              placeholder={t('ailab.form.sessionDescPlaceholder')}
                          />
                          
                          {/* Dynamic Tips */}
                          {getModeTip(newMode)}
                      </div>
                  </div>
                  <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
                      <button 
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-bold"
                      >
                          {t('common.cancel')}
                      </button>
                      <button 
                        onClick={handleCreate}
                        disabled={isCreating || !newTitle.trim() || !newDescription.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all font-bold"
                      >
                          {isCreating ? <span className="animate-spin">⏳</span> : <Play size={16} />}
                          {t('ailab.form.startExperiment')}
                      </button>
                  </div>
              </div>
          </div>
      )}
      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title={t('ailab.deleteConfirmTitle')}
        message={t('ailab.deleteConfirmMsg')}
        confirmText={isDeleting ? t('common.deleting') : t('common.confirmDelete')}
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

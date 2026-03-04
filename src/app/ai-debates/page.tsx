'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  Clock,
  Zap,
  Search,
  RefreshCw,
  Trash2,
  Play,
  Users
} from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '@/contexts';
import { authenticatedFetch, safeResponseJson } from '@/lib/http';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Debate = {
  id: string;
  topic: string;
  mode?: string;
  duration_limit?: number;
  entropy?: number;
  status: string;
  created_at: string;
  participants?: any[];
};

const statusStyles: Record<string, string> = {
  pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  running: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  terminated: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  error: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
};

export default function AIDebatesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();

  const [debates, setDebates] = useState<Debate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newMode, setNewMode] = useState<'free_discussion' | 'debate'>('free_discussion');
  const [newScrollMode, setNewScrollMode] = useState<'auto' | 'manual'>('auto');
  const [newDuration, setNewDuration] = useState(5);
  const [newEntropy, setNewEntropy] = useState(0.5);
  const [newParticipantsCount, setNewParticipantsCount] = useState(5);
  const [enableAwareness, setEnableAwareness] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setPageHeader(t('common.ai.debatesPage.title'), t('common.ai.debatesPage.subtitle'));
  }, [setPageHeader, t]);

  const fetchDebates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const url = `/api/ai/debates${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await authenticatedFetch(url);
      if (!res.ok) {
        const err: any = await safeResponseJson(res).catch(() => ({}));
        throw new Error(err?.error || t('common.loadFailed'));
      }
      const data = await safeResponseJson(res);
      setDebates(Array.isArray(data) ? (data as any) : []);
    } catch (e: any) {
      showToast(e?.message || t('common.loadFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebates();
  }, [statusFilter]);

  const filteredDebates = useMemo(() => {
    let res = debates;
    if (searchTerm) {
      res = res.filter(d => (d.topic || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      res = res.filter(d => d.status === statusFilter);
    }
    return res;
  }, [debates, searchTerm, statusFilter]);

  const runningCount = useMemo(() => debates.filter(d => d.status === 'running').length, [debates]);

  const statusLabel = (status: string) => {
    const key = `common.ai.debatesPage.status.${status}` as any;
    return t(key) || status;
  };

  const startDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const response = await authenticatedFetch(`/api/ai/debates/${pendingDeleteId}`, { method: 'DELETE' });
      if (!response.ok) {
        let err: any = {};
        try {
          err = await safeResponseJson(response);
        } catch {}
        throw new Error(err?.error || t('common.deleteFailed'));
      }
      setDebates(prev => prev.filter(d => d.id !== pendingDeleteId));
      showToast(t('common.success'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('common.deleteFailed'), 'error');
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
      setConfirmDeleteOpen(false);
    }
  };

  const handleCreate = async () => {
    if (!newTopic.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const response = await authenticatedFetch('/api/ai/debates', {
        method: 'POST',
        body: JSON.stringify({
          topic: newTopic.trim(),
          mode: newMode,
          scrollMode: newScrollMode,
          duration: newDuration,
          entropy: newEntropy,
          participants_count: newParticipantsCount,
          enable_environment_awareness: enableAwareness
        })
      });

      if (!response.ok) {
        let err: any = {};
        try {
          err = await safeResponseJson(response);
        } catch {}
        throw new Error(err?.error || t('common.opFailed'));
      }

      const newDebate = await safeResponseJson<{ id: string }>(response);
      setShowCreateModal(false);
      setNewTopic('');
      showToast(t('common.success'), 'success');
      if (newDebate?.id) {
        router.push(`/ai-debates/${newDebate.id}`);
      } else {
        fetchDebates();
      }
    } catch (e: any) {
      showToast(`${t('common.error')}: ${e?.message || ''}`.trim(), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[160px]">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('common.total')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{debates.length}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[160px]">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Play size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('common.ai.debatesPage.status.running')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{runningCount}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDebates}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title={t('common.ai.debatesPage.refresh')}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
          >
            <Plus size={18} />
            {t('common.ai.debatesPage.create')}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t('common.ai.debatesPage.search')}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full md:w-52 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('common.ai.debatesPage.status.all')}</option>
          <option value="running">{t('common.ai.debatesPage.status.running')}</option>
          <option value="completed">{t('common.ai.debatesPage.status.completed')}</option>
          <option value="pending">{t('common.ai.debatesPage.status.pending')}</option>
          <option value="terminated">{t('common.ai.debatesPage.status.terminated')}</option>
          <option value="error">{t('common.ai.debatesPage.status.error')}</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-zinc-500">{t('common.loading')}</div>
        ) : filteredDebates.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-zinc-700 dark:text-zinc-200 font-semibold">{t('common.ai.debatesPage.noData')}</div>
            <div className="text-zinc-500 text-sm mt-1">{t('common.ai.debatesPage.noDataDesc')}</div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredDebates.map(d => (
              <div
                key={d.id}
                className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                onClick={() => router.push(`/ai-debates/${d.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate">{d.topic}</div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[d.status] || statusStyles.pending}`}>
                        {statusLabel(d.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={14} />
                        {typeof d.duration_limit === 'number'
                          ? t('common.ai.debatesPage.detail.durationMinutes', { minutes: d.duration_limit })
                          : '-'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Zap size={14} />
                        {t('common.ai.debatesPage.entropy')}: {(d.entropy ?? 0).toString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} />
                        {(d.participants?.length ?? 0).toString()}
                      </span>
                    </div>
                  </div>

                  <button
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startDelete(d.id);
                    }}
                    title={t('common.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title={t('common.ai.debatesPage.detail.deleteTitle')}
        message={t('common.ai.debatesPage.detail.deleteConfirm')}
        confirmText={isDeleting ? t('common.processing') : t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {showCreateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Plus size={20} />
                </div>
                <div className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">{t('common.ai.debatesPage.create')}</div>
              </div>
              <button
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                onClick={() => setShowCreateModal(false)}
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {t('common.ai.debatesPage.topic')}
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm leading-relaxed"
                  rows={2}
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder={t('common.ai.debatesPage.topicPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <MessageSquare size={14} className="text-indigo-500" />
                    {t('common.ai.debatesPage.mode')}
                  </label>
                  <Tabs value={newMode} onValueChange={(v) => setNewMode(v as any)} className="w-full">
                    <TabsList className="w-full grid grid-cols-2 bg-zinc-100 dark:bg-zinc-800/50 p-1 h-11">
                      <TabsTrigger value="free_discussion" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm transition-all duration-200">
                        {t('common.ai.debatesPage.free')}
                      </TabsTrigger>
                      <TabsTrigger value="debate" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm transition-all duration-200">
                        {t('common.ai.debatesPage.debate')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <RefreshCw size={14} className="text-indigo-500" />
                    {t('common.ai.debatesPage.scrollMode')}
                  </label>
                  <Tabs value={newScrollMode} onValueChange={(v) => setNewScrollMode(v as any)} className="w-full">
                    <TabsList className="w-full grid grid-cols-2 bg-zinc-100 dark:bg-zinc-800/50 p-1 h-11">
                      <TabsTrigger value="auto" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm transition-all duration-200">
                        {t('common.ai.debatesPage.scrollAuto')}
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm transition-all duration-200">
                        {t('common.ai.debatesPage.scrollManual')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 pt-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Clock size={14} className="text-indigo-500" />
                      {t('common.ai.debatesPage.duration')}
                    </label>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-100 dark:border-indigo-800/50">
                      {newDuration} {t('common.ai.debatesPage.detail.minutes')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={newDuration}
                    onChange={e => setNewDuration(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium px-1">
                    <span>1m</span>
                    <span>10m</span>
                    <span>20m</span>
                    <span>30m</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Zap size={14} className="text-indigo-500" />
                      {t('common.ai.debatesPage.entropy')}
                    </label>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-100 dark:border-indigo-800/50">
                      {newEntropy.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={newEntropy}
                    onChange={e => setNewEntropy(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium px-1">
                    <span>0.0 (Stable)</span>
                    <span>0.5</span>
                    <span>1.0 (Creative)</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/30 p-2 rounded border border-zinc-100 dark:border-zinc-800/50">
                    {t('common.ai.debatesPage.entropyDesc')}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Users size={14} className="text-indigo-500" />
                      {t('common.ai.debatesPage.detail.participants')}
                    </label>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-100 dark:border-indigo-800/50">
                      {newParticipantsCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={newParticipantsCount}
                    onChange={e => setNewParticipantsCount(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium px-1">
                    <span>2</span>
                    <span>4</span>
                    <span>6</span>
                    <span>8</span>
                    <span>10</span>
                    <span>12</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 px-5 py-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                <label className="flex items-center justify-between gap-4 cursor-pointer group">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t('common.ai.debatesPage.awarenessTitle')}</div>
                    <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{t('common.ai.debatesPage.awarenessDesc')}</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enableAwareness}
                      onChange={e => setEnableAwareness(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                </label>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              <button
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 transition-all font-medium text-sm"
                onClick={() => setShowCreateModal(false)}
              >
                {t('common.ai.debatesPage.cancel')}
              </button>
              <button
                className={`px-6 py-2.5 rounded-xl text-white inline-flex items-center gap-2 font-bold text-sm shadow-lg transition-all ${newTopic.trim() ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95' : 'bg-zinc-400 cursor-not-allowed'}`}
                onClick={handleCreate}
                disabled={!newTopic.trim() || isCreating}
              >
                {isCreating ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                {isCreating ? t('common.processing') : t('common.ai.debatesPage.start')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

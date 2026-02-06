import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Zap, SlidersHorizontal } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '../../../contexts';
import { SkillCard } from './components/SkillCard';
import type { Skill } from './components/SkillCard';
import { SkillUploadModal } from './components/SkillUploadModal';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { supabase } from '../../../lib/supabase';

export default function SkillsPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  
  useEffect(() => {
    setPageHeader(t('skills.title'), t('skills.subtitle') || '');
  }, [setPageHeader, t]);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);

  // Stats
  const totalSkills = skills.length;
  const activeSkills = skills.filter(s => s.is_active).length;

  const fetchSkills = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/admin/skills', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to fetch skills');
      }
      const data = await res.json();
      setSkills(data);
    } catch (error) {
      console.error('Fetch error:', error);
      showToast('Failed to load skills', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleDelete = (id: string) => {
    setSkillToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!skillToDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/admin/skills/${skillToDelete}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete');
      }
      
      showToast(t('skills.messages.deleteSuccess'), 'success');
      fetchSkills();
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete skill', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setSkillToDelete(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/admin/skills/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update status');
      }
      
      // Optimistic update
      setSkills(skills.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      showToast(t('skills.messages.statusUpdated'), 'success');
    } catch (error) {
      console.error('Status update error:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.command.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
            {/* Stat Card 1: Total */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[120px]">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Zap size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('skills.total')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{totalSkills}</div>
                 </div>
            </div>

            {/* Stat Card 2: Active */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[120px]">
                 <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <RefreshCw size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('skills.active')}</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none">{activeSkills}</div>
                 </div>
            </div>

            {/* Refresh Button */}
            <button 
                onClick={fetchSkills}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors h-[52px] w-[52px] flex items-center justify-center"
                title={t('skills.refresh')}
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* Upload Button */}
            <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-5 h-[52px] bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <Plus size={20} />
                {t('skills.upload')}
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder={t('skills.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <SlidersHorizontal size={18} />
                <span className="text-sm font-medium">{t('skills.filter')}</span>
            </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
          <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
      ) : filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Zap size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('skills.noSkills')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                  {t('skills.noSkillsDesc')}
              </p>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                  {t('skills.uploadNow')}
              </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredSkills.map(skill => (
                  <SkillCard 
                    key={skill.id} 
                    skill={skill} 
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
              ))}
          </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
          <SkillUploadModal 
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
                setShowUploadModal(false);
                showToast(t('skills.messages.uploadSuccess'), 'success');
                fetchSkills();
            }}
          />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t('skills.messages.deleteConfirmTitle')}
        message={t('skills.messages.deleteConfirmDesc')}
        confirmText={t('skills.messages.deleteConfirmBtn')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
}

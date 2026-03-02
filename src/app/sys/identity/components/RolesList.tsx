import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Loader2, Inbox } from 'lucide-react';
import { useI18n, useToast } from '../../../../contexts';
import { authenticatedFetch } from '../../../../lib/http';
import { ConfirmModal } from '@/components/ConfirmModal';

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
}

export const RolesList = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/identity/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreate = async () => {
    if (!newRole.name) return;
    setCreating(true);
    try {
      const res = await authenticatedFetch('/api/admin/identity/roles', {
        method: 'POST',
        body: JSON.stringify(newRole)
      });
      
      if (res.ok) {
        showToast(t('common.createSuccess'), 'success');
        setNewRole({ name: '', description: '' });
        setShowCreate(false);
        fetchRoles();
      } else {
        const err = await res.json();
        showToast(err.error || t('common.createFailed'), 'error');
      }
    } catch (err) {
        showToast(t('common.createFailed'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await authenticatedFetch(`/api/admin/identity/roles/${pendingDeleteId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(t('common.deleteSuccess'), 'success');
        fetchRoles();
      } else {
        showToast(t('common.deleteFailed'), 'error');
      }
    } catch (err) {
      showToast(t('common.deleteFailed'), 'error');
    } finally {
      setPendingDeleteId(null);
    }
  };

    // Use static built-in roles only if API fails or returns empty AND we want a fallback
    // But for now, let's rely on the API data.
    const displayRoles = roles;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{t('identity.roles.title')}</h2>
        <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
            <Plus size={18} />
            {t('identity.roles.create')}
        </button>
      </div>

      {showCreate && (
        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-indigo-200 dark:border-indigo-900/50 animate-in slide-in-from-top-2">
            <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-zinc-500">{t('identity.roles.name')}</label>
                    <input 
                        value={newRole.name}
                        onChange={e => setNewRole({...newRole, name: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={t('identity.roles.namePlaceholder')}
                    />
                </div>
                <div className="flex-[2] space-y-1">
                    <label className="text-xs font-bold text-zinc-500">{t('identity.roles.description')}</label>
                    <input 
                        value={newRole.description}
                        onChange={e => setNewRole({...newRole, description: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={t('identity.roles.descriptionPlaceholder')}
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowCreate(false)}
                        className="px-4 py-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        onClick={handleCreate}
                        disabled={creating || !newRole.name}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {creating && <Loader2 size={16} className="animate-spin" />}
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete')}
        message={t('common.confirmDeleteMsg')}
        cancelText={t('common.cancel')}
        confirmText={t('common.delete')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
            <div className="col-span-full py-12 text-center text-zinc-500">{t('common.loading')}</div>
        ) : displayRoles.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                <Inbox size={48} className="text-zinc-300 mb-4" />
                <p>{t('identity.roles.empty')}</p>
            </div>
        ) : displayRoles.map(role => (
            <div key={role.id} className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group relative">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <Shield size={20} className={role.is_system ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"} />
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{role.name}</h3>
                    </div>
                    {role.is_system && (
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs rounded font-medium">
                            {t('identity.roles.system')}
                        </span>
                    )}
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4 h-10 line-clamp-2">{role.description || t('identity.roles.noDesc')}</p>
                
                <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-400 font-mono">{role.id.substring(0, 8)}...</span>
                    {!role.is_system && (
                        <button 
                            onClick={() => handleDelete(role.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

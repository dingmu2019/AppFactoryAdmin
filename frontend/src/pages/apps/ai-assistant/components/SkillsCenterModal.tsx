import { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Search, X, Zap } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useToast } from '../../../../contexts';

interface SkillItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  command: string;
  is_active: boolean;
  created_at: string;
  manifest?: any;
}

interface SkillsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkillsCenterModal = ({ isOpen, onClose }: SkillsCenterModalProps) => {
  const { showToast } = useToast();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSkills = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) return skills;
    return skills.filter(s =>
      s.name.toLowerCase().includes(kw) ||
      (s.description || '').toLowerCase().includes(kw) ||
      (s.command || '').toLowerCase().includes(kw)
    );
  }, [skills, searchTerm]);

  const fetchSkills = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/ai/chat/skills`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch skills');
      }
      setSkills(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load skills', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchSkills();
  }, [isOpen]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制', 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">技能中心</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">当前可用技能：{skills.length}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索技能名称 / 命令..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <button
              onClick={fetchSkills}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              刷新
            </button>
          </div>

          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-600" />
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              暂无可用技能
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              {filteredSkills.map(skill => (
                <div key={skill.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{skill.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        v{skill.version} · {skill.author || 'Unknown'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        已启用
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 min-h-[2.5rem]">
                    {skill.description || '暂无描述'}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-indigo-600 dark:text-indigo-400 truncate">
                      {skill.command}
                    </code>
                    <button
                      onClick={() => handleCopy(skill.command)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 transition-colors"
                      title="复制命令"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


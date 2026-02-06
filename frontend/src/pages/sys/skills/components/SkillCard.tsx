import React from 'react';
import { Trash2, Power, Terminal, Package, Clock } from 'lucide-react';
import { useI18n } from '../../../../contexts';

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  command: string;
  storage_path: string;
  manifest: any;
  is_active: boolean;
  uploaded_by?: string;
  created_at: string;
}

interface SkillCardProps {
  skill: Skill;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, onDelete, onToggleStatus }) => {
  const { t } = useI18n();

  return (
    <div className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 hover:shadow-xl overflow-hidden ${
      skill.is_active 
        ? 'border-slate-200 dark:border-slate-800' 
        : 'border-slate-100 dark:border-slate-800 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
    }`}>
      {/* Status Badge */}
      <div className="absolute top-4 right-4 flex gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${skill.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-600'}`} />
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Package size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {skill.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
               <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">{t('skills.card.version')}{skill.version}</span>
               <span className="text-xs text-slate-400 truncate">{t('skills.card.by')} {skill.author || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10">
          {skill.description || t('ai.noDesc')}
        </p>

        {/* Command */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 mb-4 flex items-center gap-2 border border-slate-100 dark:border-slate-800">
            <Terminal size={14} className="text-slate-400" />
            <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {skill.command}
            </code>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{new Date(skill.created_at).toLocaleDateString()}</span>
            </div>
        </div>
      </div>

      {/* Actions Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 rounded-b-2xl translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between z-10">
         <button
            onClick={() => onToggleStatus(skill.id, skill.is_active)}
            className={`p-2 rounded-lg transition-colors ${
                skill.is_active 
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' 
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={skill.is_active ? t('skills.card.disable') : t('skills.card.enable')}
         >
            <Power size={18} />
         </button>
         
         <div className="flex gap-2">
            <button
                onClick={() => onDelete(skill.id)}
                className="p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 rounded-lg transition-colors"
                title={t('skills.card.delete')}
            >
                <Trash2 size={18} />
            </button>
         </div>
      </div>
    </div>
  );
};

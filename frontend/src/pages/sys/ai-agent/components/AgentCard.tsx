import React from 'react';
import { Edit2, Trash2, Power, MessageSquare, GripVertical } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AgentAvatar } from '../../../../components/AgentAvatar';

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  system_prompt: string;
  is_active: boolean;
  prompts_count?: number;
  sort_order?: number;
}

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onToggleStatus }) => {
  const { t } = useI18n();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? '1.02' : '1',
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 hover:shadow-xl overflow-hidden ${
      agent.is_active 
        ? 'border-slate-200 dark:border-slate-800' 
        : 'border-slate-100 dark:border-slate-800 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
    } ${isDragging ? 'ring-2 ring-indigo-500 shadow-2xl border-transparent' : ''}`}>
      {/* Drag Handle - Positioned to not overlap avatar */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-1/2 -translate-y-1/2 left-1 p-1.5 text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all z-20"
      >
        <GripVertical size={18} />
      </div>

      {/* Status Badge */}
      <div className="absolute top-4 right-4 flex gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${agent.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-600'}`} />
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <AgentAvatar name={agent.avatar} size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {agent.name}
            </h3>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
              {agent.role || 'AI Assistant'}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10">
          {agent.description || t('common.ai.noDesc')}
        </p>

        {/* System Prompt Preview */}
        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 mb-4">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">System Prompt</div>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 line-clamp-2">
                {agent.system_prompt}
            </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-1">
                <MessageSquare size={14} />
                <span>{agent.prompts_count || 0} Prompts</span>
            </div>
        </div>
      </div>

      {/* Actions Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 rounded-b-2xl translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between z-10">
         <button
            onClick={() => onToggleStatus(agent.id, agent.is_active)}
            className={`p-2 rounded-lg transition-colors ${
                agent.is_active 
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' 
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={agent.is_active ? 'Deactivate' : 'Activate'}
         >
            <Power size={18} />
         </button>
         
         <div className="flex gap-2">
            <button
                onClick={() => onEdit(agent)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                title="Edit"
            >
                <Edit2 size={18} />
            </button>
            <button
                onClick={() => onDelete(agent.id)}
                className="p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 rounded-lg transition-colors"
                title="Delete"
            >
                <Trash2 size={18} />
            </button>
         </div>
      </div>
    </div>
  );
};

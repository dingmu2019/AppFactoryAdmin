
import React from 'react';
import { 
    Calendar, 
    RefreshCw, 
    ChevronRight,
    Trash2,
    Copy
} from 'lucide-react';
import { useI18n } from '../../../../contexts';
import type { ProgrammingPrompt } from '../../../../services/promptService';

import { motion } from 'framer-motion';

interface PromptCardProps {
    prompt: ProgrammingPrompt;
    onClick: () => void;
    onDelete?: () => void;
    onCopy?: () => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick, onDelete, onCopy }) => {
    const { t } = useI18n();

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete();
        }
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onCopy) {
            onCopy();
        }
    };

    return (
        <motion.div 
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={onClick}
            className="group bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 shadow-apple hover:shadow-apple-xl transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 p-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                {onCopy && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCopy}
                        className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 rounded-lg transition-colors glass-effect"
                        title={t('common.copy')}
                    >
                        <Copy size={14} strokeWidth={2.5} />
                    </motion.button>
                )}
                {onDelete && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleDelete}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50/80 dark:hover:bg-rose-900/30 rounded-lg transition-colors glass-effect"
                        title={t('common.delete')}
                    >
                        <Trash2 size={14} strokeWidth={2.5} />
                    </motion.button>
                )}
            </div>
            
            <div className="flex-1 space-y-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        {prompt.prompt_categories && (
                            <span className="px-2 py-0.5 bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-[0.1em]">
                                {prompt.prompt_categories.name}
                            </span>
                        )}
                        {prompt.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-[0.05em]">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white line-clamp-2 leading-tight tracking-tight">
                        {prompt.title || prompt.original_content.substring(0, 100)}
                    </h3>
                </div>

                <div className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-4 leading-relaxed font-medium opacity-80">
                    {prompt.original_content}
                </div>
            </div>
            
            <div className="pt-5 mt-5 border-t border-zinc-100/60 dark:border-zinc-800/60 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <Calendar size={12} strokeWidth={2.5} />
                    </div>
                    <span>{formatDate(prompt.created_at)}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                            <RefreshCw size={12} strokeWidth={2.5} />
                        </div>
                        <span>{prompt.usage_count || 0}</span>
                    </div>
                    <ChevronRight size={14} strokeWidth={2.5} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                </div>
            </div>
        </motion.div>
    );
};

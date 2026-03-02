import React from 'react';
import { X, Edit2, Trash2, Terminal, Copy, Sparkles, Calendar } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { type ProgrammingPrompt } from '../../../../services/promptService';

import { motion, AnimatePresence } from 'framer-motion';

interface PromptDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    prompt: ProgrammingPrompt | null;
    onEdit: () => void;
    onDelete: () => void;
    onCopy: (content: string, id: string) => void;
}

/**
 * 提示词详情侧边抽屉组件
 */
export const PromptDetailDrawer: React.FC<PromptDetailDrawerProps> = ({
    isOpen,
    onClose,
    prompt,
    onEdit,
    onDelete,
    onCopy
}) => {
    const { t } = useI18n();

    return (
        <AnimatePresence>
            {isOpen && prompt && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md" 
                        onClick={onClose} 
                    />
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 shadow-apple-xl h-full flex flex-col border-l border-zinc-200/50 dark:border-zinc-800/50"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-zinc-100/60 dark:border-zinc-800/60 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center shadow-sm">
                                    <Terminal size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                                        {t('common.prompts.detail.title')}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 opacity-80 mt-0.5">{t('common.prompts.expert')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onEdit}
                                    className="p-2.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                                    title={t('common.edit')}
                                >
                                    <Edit2 size={20} strokeWidth={2.5} />
                                </motion.button>
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onDelete}
                                    className="p-2.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50/80 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                    title={t('common.delete')}
                                >
                                    <Trash2 size={20} strokeWidth={2.5} />
                                </motion.button>
                                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClose} 
                                    className="p-2.5 text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 rounded-lg transition-all"
                                >
                                    <X size={24} strokeWidth={2.5} />
                                </motion.button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                            {/* Main Info */}
                            <div className="flex flex-wrap gap-6 items-start justify-between">
                                <div className="space-y-4 flex-1">
                                    <motion.h2 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-tight"
                                    >
                                        {prompt.title || t('common.unnamed')}
                                    </motion.h2>
                                    <div className="flex flex-wrap gap-2">
                                        {prompt.prompt_categories && (
                                            <span className="px-3 py-1 bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-800/30">
                                                {prompt.prompt_categories.name}
                                            </span>
                                        )}
                                        {prompt.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-zinc-200/50 dark:border-zinc-700/50">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-zinc-50/50 dark:bg-zinc-900/50 p-5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-center min-w-[120px] shadow-sm"
                                >
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 opacity-70">{t('common.usageCount')}</div>
                                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{prompt.usage_count || 0}</div>
                                </motion.div>
                            </div>

                            {/* Original Content */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                            <Terminal size={14} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.15em] text-zinc-500">{t('common.prompts.form.original')}</span>
                                    </div>
                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onCopy(prompt.original_content, prompt.id)}
                                        className="text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-3 py-1.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-colors shadow-sm"
                                    >
                                        <Copy size={12} strokeWidth={2.5} />
                                        {t('common.copy')}
                                    </motion.button>
                                </div>
                                <div className="p-6 bg-zinc-50/30 dark:bg-zinc-900/30 rounded-lg border border-zinc-100/60 dark:border-zinc-800/60 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono shadow-inner italic opacity-90">
                                    {prompt.original_content}
                                </div>
                            </motion.div>

                            {/* Optimized Content */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                            <Sparkles size={14} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.15em] text-emerald-600">{t('common.prompts.form.optimized')}</span>
                                    </div>
                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onCopy(prompt.optimized_content, prompt.id)}
                                        className="text-[10px] bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-apple-lg hover:shadow-apple-xl"
                                    >
                                        <Copy size={12} strokeWidth={2.5} />
                                        {t('common.copy')}
                                    </motion.button>
                                </div>
                                <div className="p-8 bg-emerald-50/30 dark:bg-emerald-900/5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/20 text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap font-mono shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Sparkles size={120} className="text-emerald-500" />
                                    </div>
                                    <div className="relative z-10">{prompt.optimized_content}</div>
                                </div>
                            </motion.div>

                            {/* Meta Data */}
                            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-zinc-100/60 dark:border-zinc-800/60">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 opacity-70">{t('common.updatedAt')}</span>
                                    <div className="flex items-center gap-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 px-4 py-3 rounded-lg border border-zinc-100/50 dark:border-zinc-800/50">
                                        <Calendar size={14} strokeWidth={2.5} className="opacity-60" />
                                        {new Date(prompt.created_at).toLocaleString(t('common.language') === 'zh' ? 'zh-CN' : 'en-US')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}; 

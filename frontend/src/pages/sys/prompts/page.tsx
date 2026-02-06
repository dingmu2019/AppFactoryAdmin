
import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Plus, 
    RefreshCw, 
    Zap, 
    Sparkles,
    Check,
    X,
    Calendar,
    Tag,
    Terminal,
    Copy,
    Trash2,
    Edit2,
    Clock,
    Filter
} from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '../../../contexts';
import { 
    fetchPrompts, 
    createPrompt, 
    updatePrompt, 
    deletePrompt, 
    trackUsage,
    fetchPromptCategories,
    type ProgrammingPrompt,
    type PromptCategory 
} from '../../../services/promptService';
import { PromptCard } from './components/PromptCard';
import { PromptCategoryModal } from './components/PromptCategoryModal';
import { ConfirmModal } from '../../../components/ConfirmModal';

const PromptsPage: React.FC = () => {
    const { t } = useI18n();
    const { showToast } = useToast();
    const { setPageHeader } = usePageHeader();
    
    const [prompts, setPrompts] = useState<ProgrammingPrompt[]>([]);
    const [categories, setCategories] = useState<PromptCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Modals
    const [selectedPrompt, setSelectedPrompt] = useState<ProgrammingPrompt | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<string | null>(null);

    // Form State
    const [isCreating, setIsCreating] = useState(false);
    const [newPromptContent, setNewPromptContent] = useState('');
    
    // Manual/Edit Form State
    const [formData, setFormData] = useState({
        title: '',
        original_content: '',
        optimized_content: '',
        tags: '',
        category_id: ''
    });

    useEffect(() => {
        setPageHeader(t('prompts.title'), t('prompts.subtitle'));
    }, [setPageHeader, t]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [promptsRes, categoriesRes] = await Promise.all([
                fetchPrompts({
                    page,
                    pageSize: 12,
                    search: searchQuery,
                    categoryId,
                    startDate,
                    endDate
                }),
                fetchPromptCategories()
            ]);
            setPrompts(promptsRes.data);
            setTotal(promptsRes.total);
            setTotalPages(promptsRes.totalPages);
            setCategories(categoriesRes);
        } catch (error) {
            showToast('加载失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, categoryId, startDate, endDate]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadData();
    };

    const handleAIExtract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPromptContent.trim()) return;
        
        setIsCreating(true);
        try {
            await createPrompt({
                content: newPromptContent,
                category_id: formData.category_id || undefined
            });
            showToast(t('prompts.messages.extractSuccess'), 'success');
            setNewPromptContent('');
            setShowCreateModal(false);
            setPage(1);
            loadData();
        } catch (error) {
            showToast('萃取失败', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleSavePrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.original_content.trim()) return;
        
        setIsCreating(true);
        try {
            const data = {
                title: formData.title,
                original_content: formData.original_content,
                optimized_content: formData.optimized_content || formData.original_content,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                category_id: formData.category_id || undefined
            };

            if (selectedPrompt && isEditing) {
                await updatePrompt(selectedPrompt.id, data);
                showToast(t('prompts.messages.updateSuccess'), 'success');
                setIsEditing(false);
                setIsDrawerOpen(false);
            } else {
                await createPrompt(data);
                showToast(t('prompts.messages.saveSuccess'), 'success');
                setShowManualModal(false);
            }
            
            setPage(1);
            loadData();
        } catch (error) {
            showToast('保存失败', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = async (content: string, id: string) => {
        try {
            await navigator.clipboard.writeText(content);
            await trackUsage(id);
            showToast(t('prompts.messages.copySuccess'), 'success');
            setPrompts(prev => prev.map(p => p.id === id ? { ...p, usage_count: (p.usage_count || 0) + 1 } : p));
        } catch (err) {
            showToast('复制失败', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!promptToDelete) return;
        try {
            await deletePrompt(promptToDelete);
            showToast(t('prompts.messages.deleteSuccess'), 'success');
            setIsDrawerOpen(false);
            setIsDeleteModalOpen(false);
            loadData();
        } catch (error) {
            showToast('删除失败', 'error');
        }
    };

    const openEdit = (prompt: ProgrammingPrompt) => {
        setSelectedPrompt(prompt);
        setFormData({
            title: prompt.title || '',
            original_content: prompt.original_content,
            optimized_content: prompt.optimized_content,
            tags: prompt.tags.join(', '),
            category_id: prompt.category_id || ''
        });
        setIsEditing(true);
        setIsDrawerOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Stat Card 1: Total */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Zap size={18} />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('prompts.total')}</div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{total}</div>
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button 
                        onClick={loadData}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors h-[52px] w-[52px] flex items-center justify-center"
                        title={t('prompts.refresh')}
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Category Management Button */}
                    <button 
                        onClick={() => setShowCategoryModal(true)}
                        className="flex items-center gap-2 px-5 h-[52px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-all shadow-sm"
                    >
                        <Tag size={20} className="text-indigo-500" />
                        {t('prompts.categories')}
                    </button>

                    {/* Manual Add Button */}
                    <button 
                        onClick={() => {
                            setSelectedPrompt(null);
                            setFormData({ title: '', original_content: '', optimized_content: '', tags: '', category_id: '' });
                            setIsEditing(false);
                            setShowManualModal(true);
                        }}
                        className="flex items-center gap-2 px-5 h-[52px] bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium transition-all shadow-sm"
                    >
                        <Plus size={20} />
                        {t('prompts.manualAdd')}
                    </button>

                    {/* AI Extraction Button */}
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 h-[52px] bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                    >
                        <Sparkles size={20} />
                        {t('prompts.aiExtraction')}
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder={t('prompts.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </form>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-all shadow-sm ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                        >
                            <Filter size={18} />
                            <span className="text-sm">{t('prompts.filter')}</span>
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{t('prompts.category')}</label>
                                <select 
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                >
                                    <option value="">{t('common.all')}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{t('prompts.startTime')}</label>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{t('prompts.endTime')}</label>
                                <input 
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => {
                                    setCategoryId('');
                                    setStartDate('');
                                    setEndDate('');
                                    setSearchQuery('');
                                }}
                                className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                            >
                                重置所有筛选
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Grid */}
            {loading && prompts.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
                    ))}
                </div>
            ) : prompts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                        <Terminal size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('prompts.noData')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-center max-w-md">
                        {t('prompts.noDataDesc')}
                    </p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowManualModal(true)}
                            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                            {t('prompts.manualAdd')}
                        </button>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all"
                        >
                            {t('prompts.aiExtraction')}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {prompts.map((prompt) => (
                            <PromptCard 
                                key={prompt.id} 
                                prompt={prompt} 
                                onClick={() => openEdit(prompt)}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <p className="text-sm text-slate-500 font-medium">共 {total} 条记录</p>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-4 py-2 text-sm font-bold border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    上一页
                                </button>
                                <div className="flex items-center px-4 text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                    {page} / {totalPages}
                                </div>
                                <button 
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-4 py-2 text-sm font-bold border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    下一页
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* AI Extraction Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                    <Sparkles size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('prompts.aiExtraction')}</h3>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAIExtract} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">{t('prompts.originalContent')}</label>
                                <textarea 
                                    autoFocus
                                    rows={6}
                                    value={newPromptContent}
                                    onChange={e => setNewPromptContent(e.target.value)}
                                    placeholder="输入您原始的需求指令，AI 将为您优化..."
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{t('prompts.category')}</label>
                                <select 
                                    value={formData.category_id}
                                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                >
                                    <option value="">{t('prompts.selectCategory')}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors font-bold"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreating || !newPromptContent.trim()}
                                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 font-bold active:scale-95"
                                >
                                    {isCreating ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                    <span>{t('prompts.aiExtraction')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manual Create / Edit Modal */}
            {(showManualModal || (isDrawerOpen && isEditing)) && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {isEditing ? t('prompts.editPrompt') : t('prompts.newPrompt')}
                                </h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowManualModal(false);
                                    setIsEditing(false);
                                    setIsDrawerOpen(false);
                                }} 
                                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSavePrompt} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">{t('prompts.promptTitle')}</label>
                                <input 
                                    autoFocus
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="输入提示词标题..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">{t('prompts.category')}</label>
                                    <select 
                                        value={formData.category_id}
                                        onChange={e => setFormData({...formData, category_id: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    >
                                        <option value="">{t('prompts.selectCategory')}</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">{t('prompts.tags')}</label>
                                    <input 
                                        value={formData.tags}
                                        onChange={e => setFormData({...formData, tags: e.target.value})}
                                        placeholder={t('prompts.tagsPlaceholder')}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">{t('prompts.originalContent')}</label>
                                <textarea 
                                    rows={3}
                                    value={formData.original_content}
                                    onChange={e => setFormData({...formData, original_content: e.target.value})}
                                    placeholder="输入原始的指令内容..."
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">{t('prompts.optimizedContent')}</label>
                                <textarea 
                                    rows={5}
                                    value={formData.optimized_content}
                                    onChange={e => setFormData({...formData, optimized_content: e.target.value})}
                                    placeholder="输入优化后的专家级提示词 (可选，留空则同原始指令)..."
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono leading-relaxed transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setShowManualModal(false);
                                        setIsEditing(false);
                                        setIsDrawerOpen(false);
                                    }}
                                    className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors font-bold"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreating || !formData.original_content.trim()}
                                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 font-bold active:scale-95"
                                >
                                    {isCreating ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                    <span>{t('common.save')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Drawer (View Mode) */}
            {isDrawerOpen && !isEditing && selectedPrompt && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Terminal size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">提示词详情</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                    title={t('common.edit')}
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button 
                                    onClick={() => {
                                        setPromptToDelete(selectedPrompt.id);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title={t('common.delete')}
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Metadata Header */}
                            <div className="flex flex-wrap gap-4 items-start justify-between">
                                <div className="space-y-3 flex-1">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {selectedPrompt.title || '未命名提示词'}
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPrompt.prompt_categories && (
                                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold">
                                                {selectedPrompt.prompt_categories.name}
                                            </span>
                                        )}
                                        {selectedPrompt.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center min-w-[100px]">
                                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">使用次数</div>
                                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{selectedPrompt.usage_count || 0}</div>
                                </div>
                            </div>

                            {/* Original Content */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                                        <Terminal size={14} />
                                        <span>原始指令</span>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(selectedPrompt.original_content, selectedPrompt.id)}
                                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                                    >
                                        <Copy size={14} />
                                        {t('prompts.copy')}
                                    </button>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                                    {selectedPrompt.original_content}
                                </div>
                            </div>

                            {/* Optimized Content */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-600">
                                        <Sparkles size={14} />
                                        <span>专家版提示词</span>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(selectedPrompt.optimized_content, selectedPrompt.id)}
                                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-bold"
                                    >
                                        <Copy size={14} />
                                        {t('prompts.copyOptimized')}
                                    </button>
                                </div>
                                <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-mono ring-1 ring-emerald-500/20 shadow-inner">
                                    {selectedPrompt.optimized_content}
                                </div>
                            </div>

                            {/* Time Metadata */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">创建时间</span>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <Calendar size={14} />
                                        {new Date(selectedPrompt.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">最后使用</span>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <Clock size={14} />
                                        {selectedPrompt.last_used_at ? new Date(selectedPrompt.last_used_at).toLocaleString() : '从未使用'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <PromptCategoryModal 
                    onClose={() => setShowCategoryModal(false)}
                    onUpdate={loadData}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('common.confirmDelete')}
                message={t('prompts.deleteConfirm')}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
            />
        </div>
    );
};

export default PromptsPage;

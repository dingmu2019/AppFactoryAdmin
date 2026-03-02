import { useState, useEffect, useCallback } from 'react';
import { useI18n, useToast, usePageHeader } from '../../../../contexts';
import { 
    fetchPrompts, 
    createPrompt, 
    updatePrompt, 
    deletePrompt, 
    trackUsage,
    fetchPromptCategories,
    type ProgrammingPrompt,
    type PromptCategory 
} from '../../../../services/promptService';

/**
 * 提示词页面逻辑处理 Hook
 */
export const usePrompts = () => {
    const { t } = useI18n();
    const { showToast } = useToast();
    const { setPageHeader } = usePageHeader();
    
    const [prompts, setPrompts] = useState<ProgrammingPrompt[]>([]);
    const [categories, setCategories] = useState<PromptCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // 筛选状态
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // 弹窗状态
    const [selectedPrompt, setSelectedPrompt] = useState<ProgrammingPrompt | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<string | null>(null);

    // 表单状态
    const [isCreating, setIsCreating] = useState(false);
    const [newPromptContent, setNewPromptContent] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        original_content: '',
        optimized_content: '',
        tags: '',
        category_id: ''
    });

    // 设置页面标题
    useEffect(() => {
        setPageHeader(t('prompts.title'), t('prompts.subtitle'));
    }, [setPageHeader, t]);

    /**
     * 加载数据
     */
    const loadData = useCallback(async () => {
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
        } catch (error: any) {
            showToast(`${t('prompts.messages.loadFailed')}: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, categoryId, startDate, endDate, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /**
     * 搜索处理
     */
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadData();
    };

    /**
     * AI 萃取处理
     */
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
        } catch (error: any) {
            showToast(`${t('prompts.messages.extractFailed')}: ${error.message}`, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * 保存提示词 (新建或更新)
     */
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
        } catch (error: any) {
            showToast(`${t('prompts.messages.saveFailed')}: ${error.message}`, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * 复制提示词内容
     */
    const handleCopy = async (content: string, id: string) => {
        try {
            await navigator.clipboard.writeText(content);
            await trackUsage(id);
            showToast(t('prompts.messages.copySuccess'), 'success');
            setPrompts(prev => prev.map(p => p.id === id ? { ...p, usage_count: (p.usage_count || 0) + 1 } : p));
        } catch (err) {
            showToast(t('common.copyFailed'), 'error');
        }
    };

    /**
     * 确认删除
     */
    const confirmDelete = async () => {
        if (!promptToDelete) return;
        try {
            await deletePrompt(promptToDelete);
            showToast(t('prompts.messages.deleteSuccess'), 'success');
            setIsDrawerOpen(false);
            setIsDeleteModalOpen(false);
            loadData();
        } catch (error: any) {
            showToast(`${t('prompts.messages.deleteFailed')}: ${error.message}`, 'error');
        }
    };

    /**
     * 打开详情查看
     */
    const openView = (prompt: ProgrammingPrompt) => {
        setSelectedPrompt(prompt);
        setIsEditing(false);
        setIsDrawerOpen(true);
    };

    /**
     * 打开编辑弹窗
     */
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

    /**
     * 重置筛选
     */
    const resetFilters = () => {
        setCategoryId('');
        setStartDate('');
        setEndDate('');
        setSearchQuery('');
        setPage(1);
    };

    return {
        t,
        prompts,
        categories,
        loading,
        total,
        page,
        setPage,
        totalPages,
        searchQuery,
        setSearchQuery,
        categoryId,
        setCategoryId,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        showFilters,
        setShowFilters,
        selectedPrompt,
        setSelectedPrompt,
        isDrawerOpen,
        setIsDrawerOpen,
        isEditing,
        setIsEditing,
        showCreateModal,
        setShowCreateModal,
        showManualModal,
        setShowManualModal,
        showCategoryModal,
        setShowCategoryModal,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        promptToDelete,
        setPromptToDelete,
        isCreating,
        newPromptContent,
        setNewPromptContent,
        formData,
        setFormData,
        loadData,
        handleSearch,
        handleAIExtract,
        handleSavePrompt,
        handleCopy,
        confirmDelete,
        openView,
        openEdit,
        resetFilters
    };
}; 

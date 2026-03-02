
'use client';

import React from 'react';
import { usePrompts } from './hooks/usePrompts';
import { PromptsHeader } from './components/PromptsHeader';
import { PromptsToolbar } from './components/PromptsToolbar';
import { PromptsGrid } from './components/PromptsGrid';
import { AIExtractionModal } from './components/AIExtractionModal';
import { PromptFormModal } from './components/PromptFormModal';
import { PromptDetailDrawer } from './components/PromptDetailDrawer';
import { PromptCategoryModal } from './components/PromptCategoryModal';
import { ConfirmModal } from '@/components/ConfirmModal';

/**
 * 提示词管理页面
 * 负责展示和管理系统提示词（Prompts）
 */
const PromptsPage: React.FC = () => {
    const {
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
    } = usePrompts();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 头部统计与操作 */}
            <PromptsHeader 
                total={total}
                loading={loading}
                onRefresh={loadData}
                onManageCategories={() => setShowCategoryModal(true)}
                onManualAdd={() => {
                    setSelectedPrompt(null);
                    setFormData({ title: '', original_content: '', optimized_content: '', tags: '', category_id: '' });
                    setIsEditing(false);
                    setShowManualModal(true);
                }}
                onAIExtract={() => setShowCreateModal(true)}
            />

            {/* 工具栏：搜索与筛选 */}
            <PromptsToolbar 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                categories={categories}
                onSearch={handleSearch}
                onResetFilters={resetFilters}
            />

            {/* 列表网格 */}
            <PromptsGrid 
                loading={loading}
                prompts={prompts}
                total={total}
                page={page}
                totalPages={totalPages}
                setPage={setPage}
                onView={openView}
                onEdit={openEdit}
                onDelete={(prompt) => {
                    setPromptToDelete(prompt.id);
                    setIsDeleteModalOpen(true);
                }}
                onCopy={handleCopy}
                onManualAdd={() => setShowManualModal(true)}
                onAIExtract={() => setShowCreateModal(true)}
            />

            {/* AI 萃取弹窗 */}
            <AIExtractionModal 
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleAIExtract}
                content={newPromptContent}
                setContent={setNewPromptContent}
                categoryId={formData.category_id}
                setCategoryId={(id) => setFormData({ ...formData, category_id: id })}
                categories={categories}
                isCreating={isCreating}
            />

            {/* 手动创建/编辑弹窗 */}
            <PromptFormModal 
                isOpen={showManualModal || (isDrawerOpen && isEditing)}
                onClose={() => {
                    setShowManualModal(false);
                    setIsEditing(false);
                    setIsDrawerOpen(false);
                }}
                onSubmit={handleSavePrompt}
                isEditing={isEditing}
                isCreating={isCreating}
                formData={formData}
                setFormData={setFormData}
                categories={categories}
            />

            {/* 详情查看抽屉 */}
            <PromptDetailDrawer 
                isOpen={isDrawerOpen && !isEditing}
                onClose={() => setIsDrawerOpen(false)}
                prompt={selectedPrompt}
                onEdit={() => setIsEditing(true)}
                onDelete={() => {
                    if (selectedPrompt) {
                        setPromptToDelete(selectedPrompt.id);
                        setIsDeleteModalOpen(true);
                    }
                }}
                onCopy={handleCopy}
            />

            {/* 分类管理弹窗 */}
            {showCategoryModal && (
                <PromptCategoryModal 
                    onClose={() => setShowCategoryModal(false)}
                    onUpdate={loadData}
                />
            )}

            {/* 删除确认弹窗 */}
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

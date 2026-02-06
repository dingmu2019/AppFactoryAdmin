
import { authenticatedFetch } from '../lib/http';

const API_BASE = '/api/admin/prompts';

export interface PromptCategory {
    id: string;
    name: string;
    code: string;
    description?: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

export interface ProgrammingPrompt {
    id: string;
    title?: string;
    original_content: string;
    optimized_content: string;
    tags: string[];
    category_id?: string;
    prompt_categories?: {
        name: string;
    };
    usage_count: number;
    last_used_at: string;
    created_at: string;
    updated_at: string;
}

export interface PromptListResponse {
    data: ProgrammingPrompt[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const fetchPrompts = async (params: {
    page: number;
    pageSize: number;
    search?: string;
    tag?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<PromptListResponse> => {
    const queryParams = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        ...(params.search && { search: params.search }),
        ...(params.tag && { tag: params.tag }),
        ...(params.categoryId && { categoryId: params.categoryId }),
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
    });

    const res = await authenticatedFetch(`${API_BASE}?${queryParams}`);
    if (!res.ok) throw new Error('Failed to fetch prompts');
    return await res.json();
};

export const createPrompt = async (data: string | Partial<ProgrammingPrompt> | { content: string; category_id?: string }) => {
    const body = typeof data === 'string' ? { content: data } : data;
    const res = await authenticatedFetch(API_BASE, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Failed to create prompt');
    return await res.json();
};

export const updatePrompt = async (id: string, data: Partial<ProgrammingPrompt>) => {
    const res = await authenticatedFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update prompt');
    return await res.json();
};

export const deletePrompt = async (id: string) => {
    const res = await authenticatedFetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete prompt');
    return await res.json();
};

export const trackUsage = async (id: string) => {
    const res = await authenticatedFetch(`${API_BASE}/${id}/usage`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to track usage');
    return await res.json();
};

// Category services
export const fetchPromptCategories = async (): Promise<PromptCategory[]> => {
    const res = await authenticatedFetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return await res.json();
};

export const createPromptCategory = async (data: Partial<PromptCategory>) => {
    const res = await authenticatedFetch(`${API_BASE}/categories`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create category');
    return await res.json();
};

export const updatePromptCategory = async (id: string, data: Partial<PromptCategory>) => {
    const res = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update category');
    return await res.json();
};

export const deletePromptCategory = async (id: string) => {
    const res = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return await res.json();
};

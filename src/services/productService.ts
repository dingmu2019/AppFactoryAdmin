
import { authenticatedFetch } from '@/lib/http';

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  app_id?: string;
  parent_id?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  saas_apps?: {
    name: string;
  };
}

export const fetchProductCategories = async (params?: { search?: string; app_id?: string }) => {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.app_id) query.append('app_id', params.app_id);
  
  const res = await authenticatedFetch(`/api/admin/product-categories?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch product categories');
  const data = await res.json();
  return data;
};

export const createProductCategory = async (data: Partial<ProductCategory>) => {
  const res = await authenticatedFetch('/api/admin/product-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create product category');
  return result;
};

export const updateProductCategory = async (id: string, data: Partial<ProductCategory>) => {
  const res = await authenticatedFetch(`/api/admin/product-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update product category');
  return result;
};

export const deleteProductCategory = async (id: string) => {
  const res = await authenticatedFetch(`/api/admin/product-categories/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete product category');
  return await res.json();
};

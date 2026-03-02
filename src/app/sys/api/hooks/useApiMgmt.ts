
import { useState, useEffect, useMemo } from 'react';
import { authenticatedFetch } from '../../../../lib/http';
import { toast } from "sonner";

export type ApiEndpoint = {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  description: string;
  category: string;
  authRequired: boolean;
  requestSchema?: any;
  responseSchema?: any;
};

export const useApiMgmt = (_t: any) => {
  const [apis, setApis] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchApis = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/apis');
      if (res.ok) {
        const json = await res.json();
        const dataList = Array.isArray(json) ? json : (json.data || []);
        setApis(dataList);
      }
    } catch (err) {
      console.error('Failed to fetch APIs:', err);
      toast.error('Failed to fetch API catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApis(); }, []);

  const categories = useMemo(() => Array.from(new Set(apis.map(api => api.category))), [apis]);
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  const filteredApis = useMemo(() => apis.filter(api => {
    const matchesSearch = api.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          api.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = !methodFilter || api.method === methodFilter;
    const matchesCategory = !categoryFilter || api.category === categoryFilter;
    return matchesSearch && matchesMethod && matchesCategory;
  }), [apis, searchTerm, methodFilter, categoryFilter]);

  const paginatedApis = useMemo(() => filteredApis.slice((page - 1) * pageSize, page * pageSize), [filteredApis, page]);
  const totalPages = Math.ceil(filteredApis.length / pageSize);

  const stats = useMemo(() => ({
    total: apis.length,
    public: apis.filter(a => !a.authRequired).length,
    protected: apis.filter(a => a.authRequired).length
  }), [apis]);

  return {
    apis, loading, searchTerm, setSearchTerm, methodFilter, setMethodFilter, categoryFilter, setCategoryFilter,
    page, setPage, pageSize, paginatedApis, totalPages, filteredApis, stats, categories, methods, fetchApis
  };
};

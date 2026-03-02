
import { authenticatedFetch } from '@/lib/http';

export const fetchApps = async () => {
  const res = await authenticatedFetch('/api/admin/apps');
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  return [];
};

export const fetchApp = async (id: string) => {
  const res = await authenticatedFetch(`/api/admin/apps/${id}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

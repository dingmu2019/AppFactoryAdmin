import { authenticatedFetch } from '../lib/http';

export interface App {
  id: string;
  name: string;
  description?: string;
  status?: string;
  [key: string]: any;
}

export const fetchApps = async (): Promise<App[]> => {
  const res = await authenticatedFetch('/api/admin/apps');
  if (!res.ok) {
    throw new Error(`Failed to fetch apps: ${res.statusText}`);
  }
  return await res.json();
};

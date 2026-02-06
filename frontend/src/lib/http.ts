import { supabase } from './supabase';

export interface FetchOptions extends RequestInit {
  // Add any custom options here if needed
}

export const authenticatedFetch = async (url: string, options: FetchOptions = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Optional: Trigger a global logout or redirect
    // For now, we let the caller handle it or the AuthContext to react
    console.warn('Unauthorized access to', url);
  }

  return response;
};

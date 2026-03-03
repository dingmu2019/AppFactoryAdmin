import { supabase } from './supabase';

export interface FetchOptions extends RequestInit {
  // Add any custom options here if needed
}

export const extractJson = (input: string) => {
  let cleaned = input.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstObj = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');
  const start =
    firstObj === -1 ? firstArr :
    firstArr === -1 ? firstObj :
    Math.min(firstObj, firstArr);
  if (start === -1) return cleaned;

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      const expected = stack.pop();
      if (expected !== ch) {
        return cleaned.slice(start).trim();
      }
      if (stack.length === 0) {
        return cleaned.slice(start, i + 1).trim();
      }
    }
  }

  return cleaned.slice(start).trim();
};

export const safeResponseJson = async <T = any>(response: Response): Promise<T> => {
  const text = await response.text();
  const tryParse = (candidate: string) => {
    try {
      return JSON.parse(candidate) as T;
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      const match = msg.match(/position\s+(\d+)/i);
      if (match) {
        const pos = Number(match[1]);
        if (Number.isFinite(pos) && pos > 0 && pos <= candidate.length) {
          return JSON.parse(candidate.slice(0, pos).trim()) as T;
        }
      }
      throw e;
    }
  };

  try {
    return tryParse(text.trim());
  } catch (e) {
    try {
      const jsonText = extractJson(text);
      return tryParse(jsonText);
    } catch (e2: any) {
      const ct = response.headers.get('content-type') || '';
      const preview = text.slice(0, 600);
      const suffix = text.length > 600 ? `\n...[truncated ${text.length - 600} chars]` : '';
      throw new Error(`Failed to parse JSON response (status=${response.status}, content-type="${ct}"). ${String(e2?.message || e2)}\n${preview}${suffix}`);
    }
  }
};

export const getApiBaseUrl = () => {
  return ''; // In Next.js, API routes are on the same domain
};

export const apiUrl = (url: string) => {
  return url;
};

export const authenticatedFetch = async (url: string, options: FetchOptions = {}) => {
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (e) {
    console.warn('[HTTP] Failed to get session:', e);
  }
  
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Next.js API routes are typically relative
  return fetch(url, {
    ...options,
    headers,
  });
};

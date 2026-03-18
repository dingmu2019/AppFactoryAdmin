import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { resources, default as i18n } from './locales/index';
import type { Locale } from './locales/index';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// --- Toast Context ---
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-lg shadow-lg bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 animate-in slide-in-from-top-2 fade-in duration-300 group cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(toast.message);
              // Visual feedback could be added here, but clicking itself is the action
            }}
            title="Click to copy error message"
          >
            {toast.type === 'success' && <CheckCircle className="text-emerald-500" size={20} />}
            {toast.type === 'error' && <XCircle className="text-rose-500" size={20} />}
            {toast.type === 'warning' && <AlertCircle className="text-amber-500" size={20} />}
            {toast.type === 'info' && <Info className="text-blue-500" size={20} />}
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex-1 break-words">{toast.message}</p>
            <div className="opacity-0 group-hover:opacity-100 text-xs text-zinc-400 mr-2 transition-opacity">Copy</div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }} 
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// --- Theme Context ---
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setThemeState] = useState<Theme>('system');

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('theme')) {
      setThemeState(localStorage.getItem('theme') as Theme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const applyTheme = (dark: boolean) => {
      if (dark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setIsDark(dark);
    };

    if (theme === 'system') {
      applyTheme(systemDark);
      localStorage.removeItem('theme');
    } else {
      applyTheme(theme === 'dark');
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // Listen for system changes if in system mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const root = window.document.documentElement;
        if (mediaQuery.matches) {
          root.classList.add('dark');
          setIsDark(true);
        } else {
          root.classList.remove('dark');
          setIsDark(false);
        }
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

// --- I18n Context ---
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, vars?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const [locale, setLocaleState] = useState<Locale>('zh');
  const [isReady, setIsReady] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('locale');
    let initial: Locale = 'zh';
    
    if (saved === 'zh' || saved === 'en') {
      initial = saved as Locale;
    } else {
      // Default to browser language or 'zh'
      const browserLang = navigator.language.toLowerCase();
      initial = browserLang.startsWith('en') ? 'en' : 'zh';
    }
    
    setLocaleState(initial);
    i18n.changeLanguage(initial);
    document.documentElement.lang = initial;
    setIsReady(true);
  }, []);

  // Persist to localStorage and sync i18next
  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem('locale', locale);
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    document.documentElement.lang = locale;
  }, [locale, isReady]);

  const t = useCallback((path: string, vars?: Record<string, any>): string => {
    const tryLookup = (p: string) => {
      const keys = p.split('.');
      let current: any = resources[locale]?.translation;
      if (!current) return undefined;
      for (const key of keys) {
        if (current === undefined || current === null || typeof current !== 'object' || current[key] === undefined) {
          return undefined;
        }
        current = current[key];
      }
      return typeof current === 'string' ? current : undefined;
    };

    // Try original path
    let result = tryLookup(path);
    
    // Fallback logic for structural inconsistencies
    if (result === undefined) {
      if (path.startsWith('common.')) {
        // common.foo.bar -> foo.bar
        result = tryLookup(path.substring(7));
      } else {
        // foo.bar -> common.foo.bar
        result = tryLookup(`common.${path}`);
      }
    }

    if (result !== undefined) {
      if (vars) {
        return Object.entries(vars).reduce((str, [key, val]) => {
          return str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
        }, result);
      }
      return result;
    }

    // Final fallback to i18next or capitalized key
    if (i18n.exists(path)) return i18n.t(path, vars);
    
    const parts = path.split('.');
    const last = parts[parts.length - 1] || path;
    // Capitalize for English, keep as is for others
    const fallback = last.replace(/([a-z])([A-Z])/g, '$1 $2');
    return locale === 'en' ? fallback.charAt(0).toUpperCase() + fallback.slice(1) : last;
  }, [locale]);

  if (!isReady) return null; // Or a loader

  return (
    <I18nContext.Provider value={{ locale, setLocale: setLocaleState, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within a I18nProvider');
  return context;
};

import { isSupabaseConfigured, supabase, COOKIE_DOMAIN } from './lib/supabase';
import { apiUrl, authenticatedFetch } from './lib/http';
import { useRouter, usePathname } from 'next/navigation';

// --- Auth Context ---
interface AuthContextType {
  user: any | null; // Use Supabase User type or custom type
  session: any | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isLoggingOut = useRef(false);

  // Helper to map Supabase user to App user
  const mapUser = (sessionUser: any) => {
    if (!sessionUser) return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
      role: sessionUser.user_metadata?.role || 'user',
      avatar: sessionUser.user_metadata?.avatar_url,
      // Map other fields as needed
    };
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem('demo_auth');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setUser(parsed?.user || null);
          setSession(parsed?.session || null);
        } catch {
          setUser(null);
          setSession(null);
        }
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(mapUser(session?.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(mapUser(session?.user));
      setLoading(false);
      
      if (_event === 'SIGNED_OUT') {
         setUser(null);
         setSession(null);
         
         const domainSuffix = COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : '';
         document.cookie = `sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT${domainSuffix};`;
         document.cookie = `sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT${domainSuffix};`;
         
         if (!isLoggingOut.current) {
             router.replace('/auth/login');
         }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const demoUser = { id: 'demo-user', email, name: 'Admin', role: 'admin' };
      const demoSession = { access_token: 'demo-token' };
      setUser(demoUser);
      setSession(demoSession);
      localStorage.setItem('demo_auth', JSON.stringify({ user: demoUser, session: demoSession }));
      return { data: { session: demoSession }, error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // 登录成功后，立即增加会话版本号并同步元数据，用于踢出其他设备上的旧会话
      try {
        await supabase.rpc('increment_session_version', { 
          target_user_id: data.user.id 
        });
        // 强制刷新会话，以获取包含最新 session_version 的 JWT
        await supabase.auth.refreshSession();
      } catch (e) {
        console.warn('[Auth] Failed to increment session version during login:', e);
      }
    }

    // Record Audit Log for Login
    try {
      // Use data.session.access_token if available
      const token = data.session?.access_token;
      
      // If login failed, we might not have a token, but we still want to log the failure.
      // However, our backend /api/audit-logs/log likely requires auth or allows unauthenticated if handled carefully.
      // But actually, for login failure, we are unauthenticated.
      // Let's check backend middleware. It extracts user if token exists.
      // If no token, req.user is undefined.
      // The log endpoint should allow anonymous logging for login attempts (or use a special system endpoint).
      
      // Use public endpoint for login failure/success logging
      await fetch('/api/public/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'LOGIN',
          resource: 'auth',
          status: error ? 'FAILURE' : 'SUCCESS',
          details: { 
            email, 
            error: error?.message,
            method: 'password',
            app_id: 'AdminSys_app' 
          }
        })
      });
    } catch (err) {
      console.error('Failed to log login event:', err);
    }

    return { data, error };
  };

  const logout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      localStorage.removeItem('demo_auth');
      isLoggingOut.current = false;
      router.replace('/auth/login');
      return;
    }

    // Record Audit Log for Logout (Before clearing session)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Use public audit-logs endpoint with keepalive: true to ensure request completes even if page unloads
        fetch('/api/public/audit-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
             action: 'LOGOUT',
             resource: 'auth',
             status: 'SUCCESS',
             details: {
               app_id: 'AdminSys_app',
               email: session.user.email 
             }
          }),
          keepalive: true
        }).catch(err => console.warn('Logout log failed:', err));
      }
    } catch (err) {
      console.warn('Failed to prepare logout log:', err);
    }

    try {
        // Try to sign out globally. 
        // net::ERR_ABORTED often happens if the browser kills the request during navigation.
        // We catch it to ensure the finally block still runs and cleans up local state.
        const { error } = await supabase.auth.signOut(); 
        if (error) {
            console.warn('Supabase signOut error:', error);
        }
    } catch (err: any) {
        // Suppress aborted requests as they are expected during navigation/unmount
        if (err?.name === 'AbortError' || err?.message?.includes('Fetch')) {
            console.log('SignOut request aborted (expected)');
        } else {
            console.error('SignOut exception:', err);
        }
    } finally {
        // Clear local state regardless of server response
        setUser(null);
        setSession(null);
        
        // Clear cookies manually to ensure sync
        const domainSuffix = COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : '';
        document.cookie = `sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT${domainSuffix};`;
        document.cookie = `sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT${domainSuffix};`;
        
        // Clear Supabase local storage just in case
        const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
        if (projectId) {
            localStorage.removeItem(`sb-${projectId}-auth-token`);
        }

        isLoggingOut.current = false;
        router.replace('/auth/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- Page Header Context ---
interface PageHeaderContextType {
  title: string | null;
  subtitle: string | null;
  setPageHeader: (title: string | null, subtitle: string | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export const PageHeaderProvider = ({ children }: PropsWithChildren) => {
  const [title, setTitle] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const pathname = usePathname();

  // Reset header on route change
  useEffect(() => {
    // Optional: Reset header or keep previous one until new page sets it?
    // Resetting avoids stale headers on pages that don't set one (though all should).
    // Let's reset for safety.
    // setTitle(null);
    // setSubtitle(null);
    // Actually, it's better to let the new page set it. If we reset here, we might get a flash of empty header.
    // But if the new page DOESN'T set it, we show the old one.
    // Given the user report "title not updating", it suggests the new page IS setting it but maybe it's not reflecting?
    // Or the new page is NOT setting it and the old one remains.
    // Let's try to FORCE reset on location change to ensure if a page forgets to set it, it shows empty (or default) rather than wrong title.
    setTitle(null);
    setSubtitle(null);
  }, [pathname]);

  const setPageHeader = useCallback((newTitle: string | null, newSubtitle: string | null) => {
    // Only update if changed to avoid loops
    setTitle(prev => (prev !== newTitle ? newTitle : prev));
    setSubtitle(prev => (prev !== newSubtitle ? newSubtitle : prev));
  }, []);

  return (
    <PageHeaderContext.Provider value={{ title, subtitle, setPageHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeader = () => {
  const context = useContext(PageHeaderContext);
  if (!context) throw new Error('usePageHeader must be used within a PageHeaderProvider');
  return context;
};

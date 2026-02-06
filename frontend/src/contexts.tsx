import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { resources } from './locales/index';
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
            className="pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 fade-in duration-300 group cursor-pointer"
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
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex-1 break-words">{toast.message}</p>
            <div className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 mr-2 transition-opacity">Copy</div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
  const [locale, setLocaleState] = useState<Locale>('zh'); // Default to Chinese

  useEffect(() => {
    const saved = localStorage.getItem('locale');
    if (saved) {
      setLocaleState(saved as Locale);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('locale', locale);
    // You could also set document.documentElement.lang = locale here
  }, [locale]);

  const t = (path: string, vars?: Record<string, any>): string => {
    const keys = path.split('.');
    let current: any = resources[locale];
    
    for (const key of keys) {
      if (current === undefined || current === null || current[key] === undefined) {
        console.warn(`Translation missing for key: ${path} in locale: ${locale}`);
        return path;
      }
      current = current[key];
    }

    if (typeof current === 'string' && vars) {
      return Object.entries(vars).reduce((str, [key, val]) => {
        return str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      }, current);
    }

    return String(current);
  };

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

import { supabase } from './lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const navigate = useNavigate();
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
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(mapUser(session?.user));
      setLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(mapUser(session?.user));
      setLoading(false);
      
      // Force refresh not needed in SPA with React Router, state update is enough
      
      // Optional: Handle redirect on auth state change if needed, 
      // but AuthGuard handles protection.
      if (_event === 'SIGNED_OUT') {
         setUser(null);
         setSession(null);
         // Clear cookies manually to ensure sync
         document.cookie = 'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
         document.cookie = 'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
         
         // Only navigate if not manually logging out (to avoid race condition with signOut promise)
         if (!isLoggingOut.current) {
             navigate('/auth/login', { replace: true });
         }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
      
      // Current implementation of /api/audit-logs/log uses extractUser.
      // It doesn't strictly require auth for the endpoint itself unless we added a guard.
      // Let's try to log.
      
      await fetch('/api/audit-logs/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'LOGIN',
          resource: 'auth',
          status: error ? 'FAILURE' : 'SUCCESS',
          // Add app_id explicitly
          details: { 
            email, 
            error: error?.message,
            method: 'password',
            app_id: 'AdminSys_app' // Context
          }
        })
      });
    } catch (err) {
      console.error('Failed to log login event:', err);
    }

    return { data, error };
  };

  const logout = async () => {
    // Record Audit Log for Logout (Before clearing session)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Use standard fetch without custom headers that might trigger CORS or network issues during unloading
        // Using keepalive: true to ensure request completes even if page unloads
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
             app_id: 'AdminSys_app',
             email: session.user.email 
          }),
          keepalive: true
        }).catch(err => console.error('Logout log failed:', err));
      }
    } catch (err) {
      console.error('Failed to prepare logout log:', err);
    }

    try {
        isLoggingOut.current = true;
        const { error } = await supabase.auth.signOut(); // Use global signOut to invalidate session on server too
        if (error) {
            console.warn('Supabase signOut error:', error);
            // Force clean up
            localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
        }
    } catch (err) {
        console.error('SignOut exception:', err);
    } finally {
        isLoggingOut.current = false;
        navigate('/auth/login', { replace: true });
    }
    
    // Redirect is handled above manually to ensure network requests finish
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
  const location = useLocation();

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
  }, [location.pathname]);

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

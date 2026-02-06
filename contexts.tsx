
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren, useCallback } from 'react';
import { resources, Locale } from './locales';
import { User } from './types';
import { MOCK_USERS } from './constants';
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
            className="pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 fade-in duration-300"
          >
            {toast.type === 'success' && <CheckCircle className="text-emerald-500" size={20} />}
            {toast.type === 'error' && <XCircle className="text-rose-500" size={20} />}
            {toast.type === 'warning' && <AlertCircle className="text-amber-500" size={20} />}
            {toast.type === 'info' && <Info className="text-blue-500" size={20} />}
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
  t: (path: string) => string;
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

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = resources[locale];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation missing for key: ${path} in locale: ${locale}`);
        return path;
      }
      current = current[key];
    }
    return current;
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
import { useRouter } from 'next/navigation';

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
      
      // Force refresh router to ensure middleware runs and updates cookies
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
      
      // Optional: Handle redirect on auth state change if needed, 
      // but AuthGuard handles protection.
      if (_event === 'SIGNED_OUT') {
         setUser(null);
         setSession(null);
         // Clear cookies manually to ensure sync
         document.cookie = 'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
         document.cookie = 'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
         router.replace('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // Redirect is handled by onAuthStateChange 'SIGNED_OUT' event
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

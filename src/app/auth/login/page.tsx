
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, KeyRound, Eye, EyeOff, ArrowRight, ShieldCheck, Globe, Monitor, Moon, Sun, Loader2 } from 'lucide-react';
import { useI18n, useTheme, useAuth, useToast } from '@/contexts';
import { StarryBackground } from '@/components/StarryBackground';
import { SYSTEM_CONFIG } from '@/constants';
import { supabase } from '@/lib/supabase';

type LoginMode = 'password' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<LoginMode>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('admin@example.com'); // Default for demo
  const [password, setPassword] = useState('password123');
  const [code, setCode] = useState('');

  // Code Timer
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let interval: any;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const sendCode = async () => {
    if (!email) {
      showToast(t('login.error.emailRequired'), 'error');
      return;
    }
    
    setIsSendingCode(true);
    try {
      console.debug('[auth][send-code] start', { email });
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        console.debug('[auth][send-code] non-json response', { email });
      }
      console.debug('[auth][send-code] response', { email, status: response.status, ok: response.ok, body: data });
      
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send code');
      }

      showToast(t('login.codeSent'), 'success');
      setCooldown(60);
    } catch (error: any) {
      console.error('[auth][send-code] failed', { email, message: error?.message, error });
      showToast(error.message || 'Failed to send verification code', 'error');
    } finally {
      setIsSendingCode(false);
    }
  };

  const validateCode = (c: string) => {
    // Basic format check: 8 alphanumeric characters
    // The strict complexity check (mixed case + number) is handled by generation and backend validation
    // But frontend can do basic length check
    return c.length === 8;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (mode === 'password') {
      const { error } = await login(email, password);
      setIsLoading(false);
      
      if (error) {
        showToast(error.message || t('login.error.invalidCredentials'), 'error');
      } else {
        showToast(t('login.welcomeBack'), 'success');
        router.push('/dashboard');
      }
    } else {
      // Code Login
      if (validateCode(code)) {
         try {
           const response = await fetch('/api/auth/login-with-code', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email, code }),
           });

           const data = await response.json();

           if (!response.ok) {
             throw new Error(data.error || 'Login failed');
           }

           if (!data.token) {
             throw new Error('No session token received');
           }

           const otpType = (data.type as any) || 'magiclink';

           // `admin.generateLink` returns an email-link token hash (query param `token`).
           // For this case we must verify using `token_hash`, not the 6-digit OTP.
           const { error: verifyError } = await supabase.auth.verifyOtp({
             token_hash: data.token,
             type: otpType,
           } as any);

           if (verifyError) {
             throw verifyError;
           }

           showToast(t('login.welcomeBack'), 'success');
           router.push('/dashboard');

         } catch (error: any) {
           showToast(error.message, 'error');
           setIsLoading(false);
         }
      } else {
         showToast(t('login.error.invalidCodeFormat'), 'error');
         setIsLoading(false);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans">
      <StarryBackground />

      {/* Top Right Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
         {/* Theme Toggle */}
         <button 
            onClick={() => {
              if (theme === 'light') setTheme('dark');
              else if (theme === 'dark') setTheme('system');
              else setTheme('light');
            }}
            className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-full p-3 flex items-center shadow-lg text-zinc-600 hover:text-indigo-600 dark:text-zinc-200/90 dark:hover:text-white transition-all active:scale-95"
            title={t('login.themeToggle')}
         >
            {theme === 'light' && <Sun size={20} />}
            {theme === 'dark' && <Moon size={20} />}
            {theme === 'system' && <Monitor size={20} />}
         </button>

         {/* Language Toggle */}
         <button 
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-200 hover:bg-white/50 dark:hover:bg-white/10 transition-all text-xs font-bold shadow-lg hover:scale-105 active:scale-95"
         >
            <Globe size={16} />
            <span className="uppercase tracking-widest">{locale === 'zh' ? 'EN' : 'CN'}</span>
         </button>
      </div>

      {/* Floating Orbs (Decorations) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] animate-pulse delay-1000 pointer-events-none"></div>

      {/* Header Info - Moved Outside Card */}
      <div className="relative z-10 text-center mb-10 animate-in slide-in-from-top-4 fade-in duration-700">
          <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 dark:from-white dark:via-indigo-100 dark:to-indigo-200 tracking-tight mb-3 drop-shadow-sm font-display">
            Nexus
          </h1>
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-indigo-500/50"></div>
             <p className="text-indigo-900 dark:text-indigo-200 text-sm font-bold tracking-[0.2em] uppercase">{t('login.subtitle')}</p>
             <div className="h-px w-8 bg-indigo-500/50"></div>
          </div>
      </div>

      {/* Main Login Card (Input Panel) */}
      <div className="relative z-10 w-full max-w-[460px] p-6 animate-in zoom-in-95 fade-in duration-500">
        <div className="bg-white/80 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-200 dark:border-white/5 rounded-lg shadow-2xl overflow-hidden ring-1 ring-zinc-900/5 dark:ring-white/10 transition-colors duration-300">
            
            {/* Tabs */}
            <div className="px-8 pt-8 mb-8">
                <div className="flex p-1.5 bg-zinc-100 dark:bg-black/40 rounded-lg relative border border-zinc-200 dark:border-white/5 transition-colors duration-300">
                    <button 
                        onClick={() => setMode('password')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 z-10 ${mode === 'password' ? 'text-indigo-900 bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] dark:text-white dark:bg-white/10 dark:shadow-none' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        {t('login.tabPassword')}
                    </button>
                    <button 
                        onClick={() => setMode('code')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 z-10 ${mode === 'code' ? 'text-indigo-900 bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] dark:text-white dark:bg-white/10 dark:shadow-none' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        {t('login.tabCode')}
                    </button>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="px-8 pb-10 space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1 transition-colors duration-300">{t('login.labelEmail')}</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="block w-full pl-11 pr-4 py-4 rounded-lg leading-5 transition-all font-medium outline-none
                            bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                            dark:bg-black/30 dark:border-white/10 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/50 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500/50 dark:[color-scheme:dark]" 
                            placeholder={t('login.emailPlaceholder')}
                            required
                        />
                    </div>
                </div>

                {mode === 'password' ? (
                    <div className="space-y-2 animate-in slide-in-from-right-8 fade-in duration-300">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1 transition-colors duration-300">{t('login.labelPassword')}</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                            <input 
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-12 py-4 rounded-lg leading-5 transition-all font-medium outline-none
                                bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                                dark:bg-black/30 dark:border-white/10 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/50 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500/50 dark:[color-scheme:dark]"
                                placeholder="••••••••"
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-white transition-colors outline-none cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 animate-in slide-in-from-left-8 fade-in duration-300">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1 transition-colors duration-300">{t('login.labelCode')}</label>
                        <div className="flex gap-3">
                             <div className="relative group flex-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <KeyRound className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input 
                                    type="text" 
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 rounded-lg leading-5 transition-all font-medium outline-none
                                    bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                                    dark:bg-black/30 dark:border-white/10 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/50 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500/50 dark:[color-scheme:dark]" 
                                    placeholder={t('login.codeHint')}
                                    required
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={sendCode}
                                disabled={cooldown > 0 || isLoading || isSendingCode}
                                className="relative z-20 px-5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200 dark:border-white/10 rounded-lg text-xs font-bold text-zinc-700 dark:text-white transition-all whitespace-nowrap min-w-[110px] uppercase tracking-wide cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSendingCode ? (
                                    <Loader2 className="animate-spin h-3 w-3" />
                                ) : cooldown > 0 ? (
                                    `${cooldown}s`
                                ) : (
                                    t('login.sendCode')
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-lg text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6 group hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin h-6 w-6" />
                    ) : (
                        <>
                            {t('login.signIn')} <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs text-zinc-500 dark:text-zinc-300/80">
            <p className="flex items-center justify-center gap-2 mb-3">
                <ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400" /> 
                <span className="font-medium tracking-wide">{t('login.secureConnection')}</span>
            </p>
            <p className="opacity-70 dark:opacity-70 font-mono">
                {SYSTEM_CONFIG.copyright} • {SYSTEM_CONFIG.version}
            </p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Menu, Search, Command, Sun, Moon, Monitor, Globe, Bell, User, ChevronDown, KeyRound, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useI18n, useTheme, useAuth } from '../../contexts';
import { Tooltip } from '../Tooltip';

import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  setSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchContainerRef: React.RefObject<HTMLDivElement | null>;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  pageSubtitle,
  setSidebarOpen,
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  setIsSearchFocused,
  searchInputRef,
  searchContainerRef,
  userMenuOpen,
  setUserMenuOpen,
  userMenuRef,
  navigate
}) => {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="glass-effect-strong border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-40 transition-all duration-300">
      <div className="px-4 sm:px-6 lg:px-10 min-h-[4rem] flex items-center justify-between py-2">
        {/* Left: Mobile Menu & Breadcrumb/Title */}
        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2.5 rounded-lg text-zinc-500 hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:bg-zinc-800/80 transition-colors"
          >
            <Menu size={22} />
          </motion.button>
          <div className="flex flex-col justify-center">
              <motion.h2 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-extrabold text-zinc-900 dark:text-white leading-tight tracking-tight"
              >
                {pageTitle}
              </motion.h2>
              {pageSubtitle && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider"
                >
                  {pageSubtitle.length > 10 ? (
                    <Tooltip content={pageSubtitle} side="bottom">
                      <span className="cursor-help border-b border-dotted border-zinc-400/50 hover:border-zinc-600 dark:hover:border-zinc-300 transition-colors">
                        {pageSubtitle.substring(0, 10)}...
                      </span>
                    </Tooltip>
                  ) : (
                    pageSubtitle
                  )}
                </motion.div>
              )}
          </div>
        </div>
        
        {/* Right: Tools & Profile */}
        <div className="flex items-center gap-3 sm:gap-6 flex-1 justify-end">
          
          {/* Omni-Bar (Command Center) */}
          <div ref={searchContainerRef} className="hidden md:block flex-1 max-w-xl mx-6 relative group">
              <div className={`flex items-center w-full bg-zinc-100/50 dark:bg-zinc-800/30 border transition-all duration-300 rounded-lg overflow-hidden ${isSearchFocused ? 'ring-4 ring-indigo-500/10 border-indigo-500/40 bg-white dark:bg-zinc-900 shadow-apple-xl' : 'border-transparent hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50'}`}>
                  <div className="pl-4 text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors">
                      <Search size={18} strokeWidth={2.5} />
                  </div>
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder={isSearchFocused ? t('common.searchAnything') : t('common.searchPlaceholder')}
                    className="w-full bg-transparent border-none focus:ring-0 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400/80 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                  />
                  <div className={`pr-4 flex items-center gap-1.5 pointer-events-none transition-opacity duration-300 ${isSearchFocused ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-zinc-700/50 border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm shadow-black/5">
                        <Command size={10} className="text-zinc-500" />
                        <span className="text-[10px] font-black text-zinc-500">K</span>
                      </div>
                  </div>
              </div>
              
              {/* Search Dropdown */}
              <AnimatePresence>
                {isSearchFocused && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute top-full left-0 right-0 mt-3 glass-effect-strong rounded-lg shadow-apple-xl border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden z-50"
                    >
                        <div className="p-3">
                            <div className="text-[10px] font-black text-zinc-400 px-4 py-2 uppercase tracking-[0.15em] opacity-80">{t('common.quickActions')}</div>
                            <button 
                              onClick={() => {
                                navigate('/ai-debates');
                                setIsSearchFocused(false);
                              }}
                              className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 text-zinc-700 dark:text-zinc-300 transition-all group/item"
                            >
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                  <span className="text-base">🚀</span>
                                </div>
                                <span className="font-semibold text-sm">{t('common.createNewDebate')}</span>
                                <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-400 font-black tracking-tighter bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <span>SHIFT</span>
                                  <span>+</span>
                                  <span>D</span>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (theme === 'light') setTheme('dark');
                else if (theme === 'dark') setTheme('system');
                else setTheme('light');
              }}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 active:scale-95 shadow-sm"
            >
              {theme === 'light' && <Sun size={18} strokeWidth={2.5} />}
              {theme === 'dark' && <Moon size={18} strokeWidth={2.5} />}
              {theme === 'system' && <Monitor size={18} strokeWidth={2.5} />}
            </motion.button>

            {/* Language Toggle */}
            <button 
              onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 active:scale-95"
            >
              <Globe size={15} />
              <span className="uppercase tracking-wide">{locale === 'zh' ? 'EN' : 'CN'}</span>
            </button>

            {/* Notifications */}
            <button className="p-2.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 relative transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-zinc-200 dark:border-zinc-700">
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1.5 transition-colors"
              >
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-zinc-800 dark:text-white leading-none">{user?.name || t('common.adminUser')}</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mt-1">{user?.email ? 'PRO USER' : 'ADMIN'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/50 dark:to-zinc-800 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <User size={18} strokeWidth={2.5} />
                </div>
                <ChevronDown size={16} className="text-zinc-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Signed in as</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {user?.email || t('common.adminUser')}
                    </div>
                  </div>

                  <div className="py-2">
                    <Link
                      href="/sys/account/change-password"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <KeyRound size={18} className="text-zinc-500 dark:text-zinc-400" />
                      <span>{t('account.changePassword.menu')}</span>
                    </Link>

                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <LogOut size={18} />
                      <span>{t('common.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

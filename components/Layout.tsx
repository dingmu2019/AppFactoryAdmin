
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  AppWindow, 
  Settings, 
  Bell, 
  Menu,
  LogOut,
  User,
  Sun,
  Moon,
  Monitor,
  Languages,
  ChevronDown,
  ChevronRight,
  Package,
  Handshake,
  Users,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  Book,
  Link2,
  FileText,
  Shield,
  AlertTriangle,
  Banknote,
  List,
  Server,
  Zap,
  Info,
  X,
  Activity,
  Rocket,
  Database,
  Bot
} from 'lucide-react';
import { useTheme, useI18n, useAuth } from '../contexts';
import { SYSTEM_CONFIG } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  path?: string;
  children?: MenuItem[];
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { logout, user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  
  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(280); 
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Resize Constants
  const MIN_WIDTH = 240;
  const MAX_WIDTH = 400;

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const stopResizing = () => setIsResizing(false);

    const resize = (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        let newWidth = mouseMoveEvent.clientX;
        if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
        if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
        setSidebarWidth(newWidth);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const menuItems: MenuItem[] = [
    { 
      id: 'overview', 
      label: t('common.overview'), 
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    { 
      id: 'apps', 
      label: t('common.appManagement'), 
      icon: AppWindow,
      path: '/apps'
    },
    { 
      id: 'ai-assistant', 
      label: t('common.aiAssistant'), 
      icon: MessageSquare,
      children: [
        { id: 'ai-chat', label: t('common.aiAssistant'), icon: Bot, path: '/ai-assistant' },
        { id: 'ai-debates', label: '智能体讨论', icon: MessageSquare, path: '/ai-debates' }
      ]
    },
    { 
      id: 'partner_mgmt', 
      label: t('common.partnerManagement'), 
      icon: Handshake,
      children: [
        { id: 'partners', label: t('common.partnerList'), icon: List, path: '/partners' },
        { id: 'partnerRebates', label: t('common.partnerRebates'), icon: Banknote, path: '/partners/rebates' },
      ]
    },
    { 
      id: 'products', 
      label: t('common.productCenter'), 
      icon: Package,
      path: '/products'
    },
    { 
      id: 'users', 
      label: t('common.userManagement'), 
      icon: Users,
      path: '/users'
    },
    { 
      id: 'orders', 
      label: t('common.orderCenter'), 
      icon: ShoppingCart,
      children: [
        { id: 'orders_list', label: t('common.orderList'), icon: List, path: '/orders' },
        { id: 'orders_refunds', label: t('common.orderRefund'), icon: Banknote, path: '/orders/refunds' },
      ]
    },
    { 
      id: 'data', 
      label: t('common.dataCenter'), 
      icon: BarChart3,
      children: [
        { id: 'data_traffic', label: t('common.trafficReports'), icon: Activity, path: '/data/traffic' },
        { id: 'data_users', label: t('common.userReports'), icon: Users, path: '/data/users' },
      ]
    },
    { 
      id: 'feedback', 
      label: t('common.feedbackCenter'), 
      icon: MessageSquare,
      path: '/feedback'
    },
    {
      id: 'system',
      label: t('common.systemManagement'),
      icon: Settings,
      children: [
        { id: 'dict', label: t('common.dictionary'), icon: Book, path: '/sys/dict' },
        { id: 'integration', label: t('common.integration'), icon: Link2, path: '/sys/integration' },
        { id: 'database', label: t('common.databaseStructure'), icon: Database, path: '/sys/database' },
        { id: 'aiAgent', label: t('common.aiAgentManagement'), icon: Bot, path: '/sys/ai-agent' },
        { id: 'apiMgmt', label: t('common.apiManagement'), icon: Server, path: '/sys/api' },
        { id: 'rules', label: t('common.rulesTriggers'), icon: Zap, path: '/sys/rules' },
        { id: 'audit', label: t('common.auditLog'), icon: FileText, path: '/sys/audit' },
        { id: 'sysLogs', label: t('common.systemErrorLog'), icon: AlertTriangle, path: '/sys/logs' },
        { id: 'about', label: t('common.aboutSystem'), icon: Info },
      ]
    },
  ];

  // Get current active label based on pathname
  const activeLabel = (function findLabel(items: MenuItem[]): string | undefined {
    for (const item of items) {
      if (item.path === pathname) return item.label;
      if (item.children) {
        const label = findLabel(item.children);
        if (label) return label;
      }
    }
    return undefined;
  })(menuItems) || t('common.overview');

  // Automatically expand parent menus when pathname changes
  useEffect(() => {
    const expandParents = (items: MenuItem[], currentPath: string): boolean => {
      for (const item of items) {
        if (item.path === currentPath) return true;
        if (item.children) {
          const found = expandParents(item.children, currentPath);
          if (found) {
            setExpandedMenus(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
            return true;
          }
        }
      }
      return false;
    };
    if (pathname) {
      expandParents(menuItems, pathname);
    }
  }, [pathname]);

  const toggleExpand = (id: string) => {
    setExpandedMenus(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    // Check if active based on path
    const isActive = item.path === pathname;
    
    // Check if any child is active for styling parent
    const isChildActive = hasChildren && (function checkChild(children: MenuItem[]): boolean {
       return children.some(c => c.path === pathname || (c.children && checkChild(c.children)));
    })(item.children!);

    const paddingLeft = `${depth * 16 + 20}px`;

    const content = (
      <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
          )}
          
          <div className="flex items-center gap-3.5 truncate">
            {item.icon && (
              <item.icon 
                size={20} 
                strokeWidth={isActive ? 2.5 : 2}
                className={`min-w-[20px] transition-colors
                  ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} 
                `} 
              />
            )}
            <span className={`truncate ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
          </div>
          {hasChildren && (
            isExpanded 
              ? <ChevronDown size={14} className="min-w-[14px] text-slate-400" /> 
              : <ChevronRight size={14} className="min-w-[14px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
      </>
    );

    const buttonClass = `relative w-full flex items-center justify-between py-3 text-sm font-medium rounded-xl transition-all duration-200 group
      ${isActive 
        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
        : isChildActive
          ? 'text-slate-800 dark:text-slate-200'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
      }
    `;

    return (
      <div key={item.id} className="mb-1">
        {item.path ? (
           <Link 
             href={item.path}
             onClick={() => setSidebarOpen(false)}
             className={buttonClass}
             style={{ paddingLeft, paddingRight: '16px' }}
           >
             {content}
           </Link>
        ) : (
          <button
            onClick={() => {
              if (hasChildren) {
                toggleExpand(item.id);
              } else if (item.id === 'about') {
                 setShowAbout(true);
                 setSidebarOpen(false);
              }
            }}
            className={buttonClass}
            style={{ paddingLeft, paddingRight: '16px' }}
          >
            {content}
          </button>
        )}
        
        {/* Submenu */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-0.5 relative">
             <div className="absolute top-0 bottom-2 w-px bg-slate-200 dark:bg-slate-800/60" style={{ left: `${depth * 16 + 29}px` }}></div>
             {item.children!.map(child => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 transition-colors duration-200 relative">
      <div className="p-6 pb-2 border-b border-transparent flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden group cursor-default">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
            <Rocket size={22} strokeWidth={2.5} className="ml-0.5" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white truncate">Super Indie</h1>
            </div>
             <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                    Pro
                </span>
                <span className="text-[10px] text-slate-400 font-mono">v{SYSTEM_CONFIG.version}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4">
         <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
      </div>
      
      <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar overflow-x-hidden pb-6">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Resizer Handle */}
      <div 
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-600 z-50 transition-colors group flex items-center justify-center ${isResizing ? 'bg-indigo-600' : 'bg-transparent'}`}
        onMouseDown={startResizing}
      >
        <div className={`h-8 w-1 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity ${isResizing ? 'opacity-100' : ''}`} />
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside 
        ref={sidebarRef}
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: sidebarOpen ? '280px' : (typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : '280px') }}
      >
        {renderSidebarContent()}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-200">
          <div className="px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-4">
            {/* Left: Mobile Menu & Breadcrumb/Title */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <Menu size={22} />
              </button>
              <div className="hidden sm:flex flex-col">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                    {activeLabel}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                    <span>Super Indie</span>
                    <ChevronRight size={10} />
                    <span>Console</span>
                  </div>
              </div>
            </div>
            
            {/* Right: Tools & Profile */}
            <div className="flex items-center gap-3 sm:gap-5">
              
              {/* Theme Toggle */}
              <button 
                onClick={() => {
                  if (theme === 'light') setTheme('dark');
                  else if (theme === 'dark') setTheme('system');
                  else setTheme('light');
                }}
                className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95"
                title={`Current theme: ${theme}`}
              >
                {theme === 'light' && <Sun size={20} />}
                {theme === 'dark' && <Moon size={20} />}
                {theme === 'system' && <Monitor size={20} />}
              </button>

              {/* Language Toggle */}
              <button 
                onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95"
              >
                <Languages size={15} />
                <span className="uppercase tracking-wide">{locale === 'zh' ? 'CN' : 'EN'}</span>
              </button>

              {/* Notifications */}
              <div className="relative group">
                <button className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 relative transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                  <Bell size={20} />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                </button>
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="hidden md:block text-right">
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{user?.name || t('common.adminUser')}</p>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">{user?.email ? 'PRO USER' : 'ADMIN'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/50 dark:to-slate-800 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <User size={18} strokeWidth={2.5} />
                </div>
                <button 
                    onClick={logout} 
                    className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20" 
                    title={t('common.logout')}
                >
                    <LogOut size={18} />
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 lg:p-10 transition-colors duration-200">
          <div className="max-w-[1600px] mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* About System Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAbout(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100 dark:border-slate-800 scale-100" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <X size={20} />
                </button>
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6 text-white transform hover:scale-105 transition-transform duration-500">
                        <Rocket size={48} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('about.title')}</h2>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                            v{SYSTEM_CONFIG.version}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                            Build {SYSTEM_CONFIG.build}
                        </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 my-8 leading-relaxed text-sm">
                        {t('about.description')}
                    </p>
                    <div className="text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-6 w-full">
                         {t('about.copyright')}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

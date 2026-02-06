import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
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
  Globe,
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
  Bot,
  Gift,
  Webhook,
  Repeat,
  FlaskConical,
  KeyRound,
  Search,
  Command
} from 'lucide-react';
import { useTheme, useI18n, useAuth, usePageHeader } from '../contexts';
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
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { logout, user } = useAuth();
  const { title: pageTitle, subtitle: pageSubtitle } = usePageHeader();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  
  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(240); 
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Omni-Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Resize Constants
  const MIN_WIDTH = 200;
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
      id: 'ai-assistant', 
      label: t('common.aiAssistant'), 
      icon: MessageSquare,
      children: [
        { id: 'ai-chat', label: t('common.ai.chat'), icon: Bot, path: '/ai-assistant' },
        { id: 'ai-debates', label: t('common.ai.debates'), icon: MessageSquare, path: '/ai-debates' },
        { id: 'ai-lab', label: t('common.ai.lab'), icon: FlaskConical, path: '/ai-lab' }
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
      children: [
        { id: 'product_categories', label: t('common.categoryManagement'), icon: List, path: '/products/categories' },
        { id: 'product_list', label: t('common.productManagement'), icon: Package, path: '/products/list' }
      ]
    },
    {
      id: 'marketing',
      label: t('common.marketing.title'),
      icon: Gift,
      children: [
        { id: 'coupons', label: t('common.marketing.coupons'), icon: Banknote, path: '/marketing/coupons' }
      ]
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
        { id: 'orders_list', label: t('common.orderList'), icon: List, path: '/orders/list' },
        { id: 'orders_refunds', label: t('common.orderRefund'), icon: Banknote, path: '/orders/refunds' },
        { id: 'subscriptions', label: t('common.subscriptions.title'), icon: Repeat, path: '/orders/subscriptions' }
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
        { id: 'apps', label: t('common.appManagement'), icon: AppWindow, path: '/apps' },
        { id: 'dict', label: t('common.dictionary'), icon: Book, path: '/sys/dict' },
        { id: 'webhooks', label: t('common.webhooks'), icon: Webhook, path: '/sys/webhooks' },
        { id: 'integration', label: t('common.integration'), icon: Link2, path: '/sys/integration' },
        { id: 'aiGateway', label: t('common.aiGateway'), icon: Bot, path: '/sys/ai-gateway' },
        { id: 'database', label: t('common.databaseStructure'), icon: Database, path: '/sys/database' },
        { id: 'identity', label: t('identity.title'), icon: Users, path: '/sys/identity' },
        { id: 'aiAgent', label: t('common.aiAgentManagement'), icon: Bot, path: '/sys/ai-agent' },
        { id: 'skills', label: t('skills.title'), icon: Zap, path: '/sys/skills' },
        { id: 'prompts', label: t('prompts.title'), icon: FileText, path: '/sys/prompts' },
        { id: 'apiMgmt', label: t('common.apiManagement'), icon: Server, path: '/sys/api' },
        { id: 'rules', label: t('common.rulesTriggers'), icon: Zap, path: '/sys/rules' },
        { id: 'audit', label: t('common.auditLog'), icon: FileText, path: '/sys/audit' },
        { id: 'sysLogs', label: t('common.systemErrorLog'), icon: AlertTriangle, path: '/sys/logs' },
        { id: 'about', label: t('common.aboutSystem'), icon: Info, path: '/about' },
      ]
    },
  ];

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      // Close search focus if clicked outside (check container instead of just input)
      if (isSearchFocused && searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    
    // Command+K shortcut
    const onKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInputRef.current?.focus();
            setIsSearchFocused(true);
        }
        // Esc to close
        if (e.key === 'Escape' && isSearchFocused) {
            setIsSearchFocused(false);
            searchInputRef.current?.blur();
        }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
        document.removeEventListener('mousedown', onDocMouseDown);
        document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen, isSearchFocused]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

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
              ? <ChevronDown size={14} className="min-w-[14px] text-slate-400 transition-transform duration-200" /> 
              : <ChevronRight size={14} className="min-w-[14px] text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
          )}
      </>
    );

    const buttonClass = `relative w-full flex items-center justify-between py-2 text-sm font-medium rounded-xl transition-all duration-200 group
      ${isActive 
        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
        : isChildActive
          ? 'text-slate-800 dark:text-slate-200'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
      }
    `;

    return (
      <div key={item.id} className="mb-0.5">
        {item.path ? (
           <Link 
             to={item.path}
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
          <div className="mt-0.5 space-y-0.5 relative ml-0.5">
             <div className="absolute top-0 bottom-2 w-px bg-slate-200 dark:bg-slate-800/80" style={{ left: `${depth * 16 + 28}px` }}></div>
             {item.children!.map(child => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 transition-colors duration-200 relative">
      <div className="h-14 px-4 flex items-center border-b border-transparent flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden group cursor-default">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white truncate font-display">Nexus</h1>
            </div>
             <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                    Core
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{SYSTEM_CONFIG.version}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-2">
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
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
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
        className={`fixed lg:static inset-y-0 left-0 z-50 transition-[translate] duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: sidebarOpen ? '240px' : (typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : '240px') }}
      >
        {renderSidebarContent()}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-200">
          <div className="px-4 sm:px-6 lg:px-8 min-h-[3.5rem] flex items-center justify-between py-3">
            {/* Left: Mobile Menu & Breadcrumb/Title */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <Menu size={22} />
              </button>
              <div className="flex flex-col justify-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {pageTitle || activeLabel}
                  </h2>
                  {pageSubtitle && (
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {pageSubtitle}
                    </div>
                  )}
              </div>
            </div>
            
            {/* Right: Tools & Profile */}
            <div className="flex items-center gap-3 sm:gap-5 flex-1 justify-end">
              
              {/* Omni-Bar (Command Center) */}
              <div ref={searchContainerRef} className="hidden md:block flex-1 max-w-xl mx-4 relative group">
                  <div className={`flex items-center w-full bg-slate-100 dark:bg-slate-800/50 border transition-all duration-200 rounded-xl overflow-hidden ${isSearchFocused ? 'ring-2 ring-indigo-500/20 border-indigo-500/50 bg-white dark:bg-slate-900 shadow-lg shadow-indigo-500/10' : 'border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}>
                      <div className="pl-3 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
                          <Search size={18} />
                      </div>
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder={isSearchFocused ? "Ask anything or jump to..." : "Search or type command..."}
                        className="w-full bg-transparent border-none focus:ring-0 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                      />
                      <div className={`pr-3 flex items-center gap-1.5 pointer-events-none transition-opacity duration-200 ${isSearchFocused ? 'opacity-0' : 'opacity-100'}`}>
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <Command size={10} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400">K</span>
                          </div>
                      </div>
                  </div>
                  
                  {/* Search Dropdown (Mock) */}
                  {isSearchFocused && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                          <div className="p-2">
                              <div className="text-xs font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Quick Actions</div>
                              <button 
                                onClick={() => {
                                  navigate('/ai-debates');
                                  setIsSearchFocused(false);
                                  // Optional: Trigger creation modal if possible, or just navigate
                                }}
                                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors"
                              >
                                  <Rocket size={16} className="text-indigo-500" />
                                  <span>Create New Debate</span>
                                  <span className="ml-auto text-xs text-slate-400 font-mono">Shift+D</span>
                              </button>
                              <button 
                                onClick={() => {
                                  navigate('/dashboard');
                                  setIsSearchFocused(false);
                                }}
                                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors"
                              >
                                  <BarChart3 size={16} className="text-emerald-500" />
                                  <span>View Revenue Analytics</span>
                              </button>
                              
                              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
                              
                              <div className="text-xs font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Recent</div>
                              <button 
                                onClick={() => {
                                  // Mock navigation to a debate
                                  navigate('/ai-debates');
                                  setIsSearchFocused(false);
                                }}
                                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 transition-colors"
                              >
                                  <MessageSquare size={16} className="text-slate-400" />
                                  <span>Debate: "Vue vs React"</span>
                              </button>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[10px] text-slate-400 flex justify-between">
                              <span>Search is powered by AI Context Awareness</span>
                              <div className="flex gap-2">
                                  <span><b className="text-slate-500">↵</b> to select</span>
                                  <span><b className="text-slate-500">esc</b> to close</span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

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
                <Globe size={15} />
                <span className="uppercase tracking-wide">{locale === 'zh' ? 'EN' : 'CN'}</span>
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
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1.5 transition-colors"
                    title={user?.email || t('common.adminUser')}
                  >
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{user?.name || t('common.adminUser')}</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">{user?.email ? 'PRO USER' : 'ADMIN'}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/50 dark:to-slate-800 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <User size={18} strokeWidth={2.5} />
                    </div>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Signed in as</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {user?.email || t('common.adminUser')}
                        </div>
                      </div>

                      <div className="py-2">
                        <Link
                          to="/sys/account/change-password"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <KeyRound size={18} className="text-slate-500 dark:text-slate-400" />
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

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors duration-200">
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
                            {SYSTEM_CONFIG.version}
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

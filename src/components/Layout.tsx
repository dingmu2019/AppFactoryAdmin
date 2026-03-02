import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  AppWindow, 
  Settings, 
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
  Server, 
  Zap, 
  Info, 
  Activity, 
  Database, 
  Bot, 
  Gift, 
  Webhook, 
  Repeat, 
  FlaskConical,
  List,
  Banknote
} from 'lucide-react';
import { useI18n, usePageHeader } from '../contexts';
import { Sidebar, type MenuItem } from './layout/Sidebar';
import { Header } from './layout/Header';
import { AboutModal } from './layout/AboutModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  // const { theme, setTheme } = useTheme();
  // const { showToast } = useToast();
  const { title: pageTitle, subtitle: pageSubtitle } = usePageHeader();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  
  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(240); 
  const [isResizing, setIsResizing] = useState(false);
  // const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Omni-Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const MIN_WIDTH = 200;
  const MAX_WIDTH = 400;

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
        { id: 'ai-chat', label: t('common.ai.chat'), icon: Bot, path: '/apps/ai-assistant' },
        { id: 'ai-debates', label: t('common.ai.debates'), icon: MessageSquare, path: '/ai-debates' },
        { id: 'ai-lab', label: t('common.ai.lab'), icon: FlaskConical, path: '/apps/ai-lab' }
      ]
    },
    {
      id: 'partners',
      label: t('common.partnerManagement'),
      icon: Handshake,
      children: [
        { id: 'partner-list', label: t('common.partnerList'), icon: List, path: '/partners' },
        { id: 'partner-rebates', label: t('common.partnerRebates'), icon: Banknote, path: '/partners/rebates' }
      ]
    },
    { 
      id: 'products', 
      label: t('common.productCenter'), 
      icon: Package,
      children: [
        { id: 'product-categories', label: t('common.categoryManagement'), icon: List, path: '/products/categories' },
        { id: 'product-list', label: t('common.productManagement'), icon: Package, path: '/products' }
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
        { id: 'order-list', label: t('common.orderList'), icon: List, path: '/orders' },
        { id: 'order-refunds', label: t('common.orderRefund'), icon: Banknote, path: '/orders/refunds' },
        { id: 'subscriptions', label: t('common.subscriptions.title'), icon: Repeat, path: '/orders/subscriptions' }
      ]
    },
    {
      id: 'system',
      label: t('common.systemManagement'),
      icon: Settings,
      children: [
        { id: 'apps', label: t('common.appManagement'), icon: AppWindow, path: '/apps' },
        { id: 'webhooks', label: t('common.webhooks'), icon: Webhook, path: '/sys/webhooks' },
        { id: 'integration', label: t('common.integration.title'), icon: Link2, path: '/sys/integration' },
        { id: 'aiGateway', label: t('common.aiGateway'), icon: Bot, path: '/sys/ai-gateway' },
        { id: 'database', label: t('common.databaseStructure'), icon: Database, path: '/sys/database' },
        { id: 'identity', label: t('identity.title'), icon: Users, path: '/sys/identity' },
        { id: 'aiAgent', label: t('common.aiAgentManagement'), icon: Bot, path: '/sys/ai-agent' },
        { id: 'skills', label: t('skills.title'), icon: Zap, path: '/sys/skills' },
        { id: 'prompts', label: t('prompts.title'), icon: FileText, path: '/sys/prompts' },
        { id: 'apiMgmt', label: t('common.apiManagement'), icon: Server, path: '/sys/api' },
        { id: 'audit', label: t('common.auditLog'), icon: FileText, path: '/sys/audit' },
        { id: 'sysLogs', label: t('common.systemErrorLog'), icon: AlertTriangle, path: '/sys/logs' },
        { id: 'about', label: t('common.aboutSystem'), icon: Info, path: '/about' },
      ]
    },
  ];

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

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (isSearchFocused && searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInputRef.current?.focus();
            setIsSearchFocused(true);
        }
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

  return (
    <div className={`flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden transition-colors duration-200 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        menuItems={menuItems}
        sidebarWidth={sidebarWidth}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        expandedMenus={expandedMenus}
        toggleExpand={toggleExpand}
        isResizing={isResizing}
        startResizing={startResizing}
        setShowAbout={setShowAbout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header 
          pageTitle={pageTitle || activeLabel}
          pageSubtitle={pageSubtitle || undefined}
          setSidebarOpen={setSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchFocused={isSearchFocused}
          setIsSearchFocused={setIsSearchFocused}
          searchInputRef={searchInputRef}
          searchContainerRef={searchContainerRef}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          userMenuRef={userMenuRef}
          navigate={router.push}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 transition-colors duration-200">
          <div className="max-w-[1600px] mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* About System Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
};

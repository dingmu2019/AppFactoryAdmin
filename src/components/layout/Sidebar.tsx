import React from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SYSTEM_CONFIG } from '../../constants';

import { motion, AnimatePresence } from 'framer-motion';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  path?: string;
  children?: MenuItem[];
}

interface SidebarProps {
  menuItems: MenuItem[];
  sidebarWidth: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  expandedMenus: string[];
  toggleExpand: (id: string) => void;
  isResizing: boolean;
  startResizing: (e: React.MouseEvent) => void;
  setShowAbout: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  menuItems,
  sidebarWidth,
  sidebarOpen,
  setSidebarOpen,
  expandedMenus,
  toggleExpand,
  isResizing,
  startResizing,
  setShowAbout
}) => {
  const pathname = usePathname();

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = item.path === pathname;
    
    const isChildActive = hasChildren && (function checkChild(children: MenuItem[]): boolean {
       return children.some(c => c.path === pathname || (c.children && checkChild(c.children)));
    })(item.children!);

    const paddingLeft = `${depth * 12 + 16}px`;

    const content = (
      <>
          <div className="flex items-center gap-3.5 truncate">
            {item.icon && (
              <item.icon 
                size={18} 
                strokeWidth={isActive ? 2.5 : 2}
                className={`min-w-[18px] transition-all duration-300
                  ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'} 
                `} 
              />
            )}
            <span className={`truncate text-sm tracking-tight transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </div>
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ChevronRight size={14} className={`min-w-[14px] transition-colors ${isExpanded ? 'text-indigo-500' : 'text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400'}`} />
            </motion.div>
          )}
      </>
    );

    const buttonClass = `relative w-full flex items-center justify-between py-2 rounded-lg transition-all duration-300 group
      ${isActive 
        ? 'bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-500/5' 
        : isChildActive
          ? 'text-zinc-800 dark:text-zinc-200 font-bold'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'
      }
    `;

    return (
      <div key={item.id} className="mb-0.5">
        {item.path ? (
           <Link 
             href={item.path}
             onClick={() => setSidebarOpen(false)}
             className={buttonClass}
             style={{ paddingLeft, paddingRight: '12px' }}
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
            style={{ paddingLeft, paddingRight: '12px' }}
          >
            {content}
          </button>
        )}
        
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="mt-0.5 space-y-0.5 overflow-hidden"
            >
               {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <aside 
      className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ width: sidebarOpen ? '260px' : (typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : '260px') }}
    >
      <div className="flex flex-col h-full glass-effect text-zinc-900 dark:text-white border-r border-zinc-200/50 dark:border-zinc-800/50 transition-colors duration-300 relative shadow-apple">
        <div className="h-20 px-6 flex items-center flex-shrink-0">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 overflow-hidden group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white flex-shrink-0 shadow-apple-lg group-hover:shadow-apple-xl transition-all duration-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-xl tracking-tighter text-zinc-900 dark:text-white truncate font-display">Nexus</h1>
              </div>
               <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-black tracking-widest uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-800/30">
                      CORE
                  </span>
                  <span className="text-[10px] text-zinc-400 font-black opacity-60">v{SYSTEM_CONFIG.version}</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        <nav className="flex-1 px-3 overflow-y-auto no-scrollbar overflow-x-hidden pb-10">
          <div className="px-3 mb-2 mt-1">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200/50 dark:via-zinc-800/50 to-transparent"></div>
          </div>
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* Resizer Handle */}
        <div 
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-600 z-50 transition-colors group flex items-center justify-center ${isResizing ? 'bg-indigo-600' : 'bg-transparent'}`}
          onMouseDown={startResizing}
        >
          <div className={`h-8 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity ${isResizing ? 'opacity-100' : ''}`} />
        </div>
      </div>
    </aside>
  );
};

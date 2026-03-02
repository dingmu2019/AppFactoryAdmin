
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      let top = 0;
      let left = 0;
      const gap = 8;

      switch (side) {
        case 'top':
          top = rect.top - gap;
          left = centerX;
          break;
        case 'bottom':
          top = rect.bottom + gap;
          left = centerX;
          break;
        case 'left':
          top = centerY;
          left = rect.left - gap;
          break;
        case 'right':
          top = centerY;
          left = rect.right + gap;
          break;
      }
      
      setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Clone element to attach ref and events
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      (children as any).props.onMouseEnter?.(e);
      handleMouseEnter();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      (children as any).props.onMouseLeave?.(e);
      handleMouseLeave();
    }
  } as any);

  return (
    <>
      {trigger}
      {isVisible && createPortal(
        <div 
          className={`fixed z-[9999] px-2.5 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-700 rounded-lg shadow-xl pointer-events-none transform animate-in fade-in zoom-in-95 duration-200 
            ${side === 'top' ? '-translate-x-1/2 -translate-y-full' : ''}
            ${side === 'bottom' ? '-translate-x-1/2' : ''}
            ${side === 'left' ? '-translate-x-full -translate-y-1/2' : ''}
            ${side === 'right' ? '-translate-y-1/2' : ''}
          `}
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          {side === 'top' && (
             <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700" />
          )}
          {side === 'bottom' && (
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-zinc-900 dark:border-b-zinc-700" />
          )}
          {side === 'left' && (
             <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-zinc-900 dark:border-l-zinc-700" />
          )}
          {side === 'right' && (
             <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-zinc-900 dark:border-r-zinc-700" />
          )}
        </div>,
        document.body
      )}
    </>
  );
};

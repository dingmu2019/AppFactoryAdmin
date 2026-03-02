import React, { useEffect, useState, useRef } from 'react';
import { Copy, Scissors, Clipboard, CheckSquare } from 'lucide-react';
import { useToast, useI18n } from '../contexts';

export const InputContextMenu: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [target, setTarget] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      // Only show for input (text/password/email etc) and textarea
      const isValidInput = (el.tagName === 'INPUT' && (
          ['text', 'password', 'email', 'number', 'search', 'url', 'tel'].includes((el as HTMLInputElement).type)
      )) || el.tagName === 'TEXTAREA';

      if (isValidInput) {
        e.preventDefault();
        setTarget(el as HTMLInputElement | HTMLTextAreaElement);
        
        // Adjust position to not go off-screen
        let x = e.clientX;
        let y = e.clientY;
        
        // We'll adjust these in layout effect if needed, but simple bounding check helps
        if (x + 200 > window.innerWidth) x = window.innerWidth - 200;
        if (y + 200 > window.innerHeight) y = window.innerHeight - 200;

        setPosition({ x, y });
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    const handleScroll = () => setVisible(false);

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, true); // Capture scroll on any element

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleAction = async (action: 'copy' | 'cut' | 'paste' | 'selectAll') => {
    if (!target) return;
    target.focus();

    try {
      switch (action) {
        case 'selectAll':
          target.select();
          break;
        case 'copy':
          // Modern API preferred, fallback to execCommand
          const selection = target.value.substring(target.selectionStart || 0, target.selectionEnd || 0);
          if (selection) {
             await navigator.clipboard.writeText(selection);
          } else {
             // If nothing selected, maybe copy all? No, standard is selection only.
             showToast(t('common.inputMenu.noSelection'), 'info');
          }
          break;
        case 'cut':
          const cutSelection = target.value.substring(target.selectionStart || 0, target.selectionEnd || 0);
          if (cutSelection) {
             await navigator.clipboard.writeText(cutSelection);
             // Remove text
             if (!target.readOnly && !target.disabled) {
                 const start = target.selectionStart || 0;
                 const end = target.selectionEnd || 0;
                 const text = target.value;
                 target.value = text.slice(0, start) + text.slice(end);
                 // Restore cursor
                 target.setSelectionRange(start, start);
                 // Trigger change event for React controlled inputs
                 const event = new Event('input', { bubbles: true });
                 target.dispatchEvent(event);
             }
          }
          break;
        case 'paste':
          if (target.readOnly || target.disabled) return;
          try {
              const text = await navigator.clipboard.readText();
              if (text) {
                  const start = target.selectionStart || 0;
                  const end = target.selectionEnd || 0;
                  const originalText = target.value;
                  // Insert text
                  target.value = originalText.slice(0, start) + text + originalText.slice(end);
                  // Move cursor
                  const newPos = start + text.length;
                  target.setSelectionRange(newPos, newPos);
                  // Trigger change event
                  const event = new Event('input', { bubbles: true });
                  target.dispatchEvent(event);
              }
          } catch (err) {
              console.error('Paste failed:', err);
              showToast(t('common.inputMenu.clipboardUnavailablePasteHint'), 'error');
          }
          break;
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
    setVisible(false);
  };

  if (!visible) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div 
      ref={menuRef}
      className="fixed z-[9999] w-48 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col text-zinc-200 text-sm font-medium select-none"
      style={{ top: position.y, left: position.x }}
    >
      <button 
        onClick={() => handleAction('selectAll')}
        className="px-3 py-2 hover:bg-white/10 flex items-center justify-between group transition-colors text-left"
      >
        <span className="flex items-center gap-3">
            <CheckSquare size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
            {t('common.selectAll')}
        </span>
        <span className="text-xs text-zinc-500 font-mono">{cmdKey}A</span>
      </button>
      
      <div className="h-px bg-white/10 my-1 mx-3" />

      <button 
        onClick={() => handleAction('copy')}
        className="px-3 py-2 hover:bg-white/10 flex items-center justify-between group transition-colors text-left"
      >
        <span className="flex items-center gap-3">
            <Copy size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
            {t('common.copy')}
        </span>
        <span className="text-xs text-zinc-500 font-mono">{cmdKey}C</span>
      </button>

      <button 
        onClick={() => handleAction('cut')}
        className={`px-3 py-2 hover:bg-white/10 flex items-center justify-between group transition-colors text-left ${target?.readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={target?.readOnly}
      >
        <span className="flex items-center gap-3">
            <Scissors size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
            {t('common.cut')}
        </span>
        <span className="text-xs text-zinc-500 font-mono">{cmdKey}X</span>
      </button>

      <button 
        onClick={() => handleAction('paste')}
        className={`px-3 py-2 hover:bg-white/10 flex items-center justify-between group transition-colors text-left ${target?.readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={target?.readOnly}
      >
        <span className="flex items-center gap-3">
            <Clipboard size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
            {t('common.paste')}
        </span>
        <span className="text-xs text-zinc-500 font-mono">{cmdKey}V</span>
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import type { ComponentType } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const Highlighter = SyntaxHighlighter as unknown as ComponentType<any>;

  const normalizedValue = value.trim();
  const normalizedLanguage = (language || '').trim().toLowerCase();
  const isPlainTextLanguage = normalizedLanguage === '' || normalizedLanguage === 'text' || normalizedLanguage === 'plaintext' || normalizedLanguage === 'txt';
  const isSingleLine = !normalizedValue.includes('\n');
  const isSingleToken = /^\S+$/.test(normalizedValue);
  const shouldRenderInline = isPlainTextLanguage && isSingleLine && isSingleToken && normalizedValue.length > 0 && normalizedValue.length <= 64;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (shouldRenderInline) {
    return (
      <code className="markdown-inline-code">{normalizedValue}</code>
    );
  }

  return (
    <div className="relative group rounded-lg overflow-hidden my-4 border border-zinc-200 dark:border-zinc-800 bg-[#1e1e1e] !select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      {/* Header - Only visible on hover */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-black/20 backdrop-blur-sm border-b border-white/5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
        >
          {isCopied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-500">{t('common.copySuccess')}</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>{t('common.copy')}</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="pt-2">
        <Highlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          background: 'transparent'
        }}
        wrapLines={true}
        showLineNumbers={true}
        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
      >
        {value}
      </Highlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
